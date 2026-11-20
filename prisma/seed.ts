import { PrismaClient } from "@prisma/client";
import { bulkImportQuestions, createQuestion, publishQuestion } from "@/lib/admin/questions";
import { BADGE_DEFINITIONS } from "@/lib/gamification/badges";
import { QUESTION_CATEGORIES } from "./question-categories";
import { SEED_QUESTIONS } from "./seed-questions";
import {
  STIMULUS_RECALL_PAIRS,
  TIME_BY_DIFFICULTY,
  WEIGHT_BY_DIFFICULTY,
} from "./seed-stimulus-recall-pairs";

const prisma = new PrismaClient();

const TOTAL_SEEDED_QUESTIONS = SEED_QUESTIONS.length + STIMULUS_RECALL_PAIRS.length * 2;

/**
 * Seeds system_settings defaults, the v1 assessment template, question
 * categories, the standard question bank (prisma/seed-questions.ts), and
 * the delayed-recall stimulus/recall pairs (prisma/seed-stimulus-recall-
 * pairs.ts). Idempotent: safe to re-run (upserts by unique key for
 * settings/template/categories; questions are reset-and-reimported only
 * when the current count doesn't match the expected total, so growing the
 * seed data and rerunning picks up the new questions without duplicating
 * on a no-op run).
 */
async function seedStimulusRecallPairs(): Promise<number> {
  let created = 0;

  for (const pair of STIMULUS_RECALL_PAIRS) {
    const stimulus = await createQuestion({
      questionText: pair.stimulusText,
      difficulty: pair.difficulty,
      categorySlug: pair.categorySlug,
      explanation: "Not scored — this is a memorize-this screen, not a question with an answer.",
      expectedSolvingTimeSeconds: 15,
      scoringWeight: 0,
      kind: "STIMULUS",
      options: [],
    });
    await publishQuestion(stimulus.id);

    const recall = await createQuestion({
      questionText: pair.recallText,
      difficulty: pair.difficulty,
      categorySlug: pair.categorySlug,
      explanation: pair.explanation,
      expectedSolvingTimeSeconds: TIME_BY_DIFFICULTY[pair.difficulty],
      scoringWeight: WEIGHT_BY_DIFFICULTY[pair.difficulty],
      kind: "RECALL",
      stimulusQuestionId: stimulus.id,
      options: pair.recallOptions,
    });
    await publishQuestion(recall.id);

    created += 2;
  }

  return created;
}
async function main() {
  await prisma.systemSetting.upsert({
    where: { key: "free_tier_allocation" },
    update: {},
    create: {
      key: "free_tier_allocation",
      // count + cap live in the same row so the atomic allocation UPDATE
      // (docs/DATABASE.md §3) stays a single-row operation; cap is still
      // admin-editable through this same row (Part 9 configurability).
      value: { count: 0, cap: 10 },
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: "reminder_interval_days" },
    update: {},
    create: { key: "reminder_interval_days", value: { value: 7 } },
  });

  await prisma.systemSetting.upsert({
    where: { key: "reminder_max_count" },
    update: {},
    create: { key: "reminder_max_count", value: { value: 10 } },
  });

  await prisma.systemSetting.upsert({
    where: { key: "referral_qualification_threshold" },
    update: {},
    create: { key: "referral_qualification_threshold", value: { value: 2 } },
  });

  for (const [code, definition] of Object.entries(BADGE_DEFINITIONS)) {
    await prisma.achievement.upsert({
      where: { code },
      update: { name: definition.name, description: definition.description },
      create: { code, name: definition.name, description: definition.description },
    });
  }

  const existingTemplate = await prisma.assessmentTemplate.findFirst({
    where: { isActive: true },
  });

  if (!existingTemplate) {
    await prisma.assessmentTemplate.create({
      data: {
        name: "Standard Assessment v1",
        version: 1,
        durationMinutes: 20,
        totalQuestions: 30,
        easyCount: 10,
        mediumCount: 10,
        hardCount: 10,
        // Populated with real category targets once the question bank
        // exists (Phase 4) — empty means "no category balancing enforced
        // yet," not "zero categories allowed."
        categoryDistribution: {},
        // docs/SCORING.md v1 weights.
        scoringWeights: { EASY: 1.0, MEDIUM: 1.5, HARD: 2.0 },
        isActive: true,
      },
    });
  }

  for (const category of QUESTION_CATEGORIES) {
    await prisma.questionCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  const existingQuestionCount = await prisma.question.count();
  if (existingQuestionCount !== TOTAL_SEEDED_QUESTIONS) {
    // Safe in dev: assessment_question has no FK to question with
    // onDelete cascade, so this only runs cleanly when nothing references
    // the current questions yet (true for a fresh/dev database).
    await prisma.question.deleteMany();

    const report = await bulkImportQuestions(SEED_QUESTIONS);
    if (report.errors.length > 0) {
      console.error("Seed question import had errors:", report.errors);
      process.exit(1);
    }
    for (const id of report.created) {
      await publishQuestion(id);
    }

    const pairsCreated = await seedStimulusRecallPairs();

    console.log(
      `Seeded and published ${report.created.length} standard questions + ${pairsCreated} stimulus/recall questions.`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
