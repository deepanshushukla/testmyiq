import { prisma } from "@/lib/db/client";
import { bulkImportQuestions, createQuestion, publishQuestion } from "@/lib/admin/questions";
import { BADGE_DEFINITIONS } from "@/lib/gamification/badges";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { submitAnswer } from "@/lib/assessment/answer";
import { submitAssessment } from "@/lib/assessment/submit";
import { QUESTION_CATEGORIES } from "@/prisma/question-categories";
import { SEED_QUESTIONS } from "@/prisma/seed-questions";
import {
  STIMULUS_RECALL_PAIRS,
  TIME_BY_DIFFICULTY,
  WEIGHT_BY_DIFFICULTY,
} from "@/prisma/seed-stimulus-recall-pairs";

/**
 * Resets everything the assessment engine touches and reseeds it with the
 * real 10-category/30-question bank (the same data prisma/seed.ts uses in
 * dev) plus one active template — so these tests exercise realistic data
 * shape, not a hand-rolled fixture that could drift from reality.
 */
export async function seedAssessmentFixtures() {
  await prisma.assessmentAnswer.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.emailReminder.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionCategory.deleteMany();
  await prisma.assessmentTemplate.deleteMany();
  await prisma.user.deleteMany();

  for (const category of QUESTION_CATEGORIES) {
    await prisma.questionCategory.create({ data: category });
  }

  for (const [code, definition] of Object.entries(BADGE_DEFINITIONS)) {
    await prisma.achievement.upsert({
      where: { code },
      update: {},
      create: { code, name: definition.name, description: definition.description },
    });
  }

  const report = await bulkImportQuestions(SEED_QUESTIONS);
  for (const id of report.created) {
    await publishQuestion(id);
  }

  const template = await prisma.assessmentTemplate.create({
    data: {
      name: "Test template",
      version: 1,
      durationMinutes: 20,
      totalQuestions: 30,
      easyCount: 10,
      mediumCount: 10,
      hardCount: 10,
      categoryDistribution: {},
      scoringWeights: { EASY: 1, MEDIUM: 1.5, HARD: 2 },
      isActive: true,
    },
  });

  return { template };
}

export async function createVerifiedUser(email: string, isFreeTierEligible = false) {
  return prisma.user.create({
    data: { email, emailVerifiedAt: new Date(), isFreeTierEligible },
  });
}

/**
 * Starts a fresh attempt for the user and answers every scored question
 * deterministically (STIMULUS questions are skipped — nothing to answer),
 * then submits. Reads the real correct option directly from the DB
 * (something only test code should ever do — the serializer the app
 * actually uses never exposes it) so tests can assert exact scoring
 * outcomes instead of random ones.
 */
export async function startAndSubmitAssessment(
  userId: string,
  mode: "all-correct" | "all-incorrect" | "all-unanswered" = "all-correct",
) {
  const assessment = await startOrResumeAssessment(userId);

  if (mode !== "all-unanswered") {
    const assessmentQuestions = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: assessment.id },
      include: { question: { include: { options: true } } },
    });

    for (const assessmentQuestion of assessmentQuestions) {
      if (assessmentQuestion.question.kind === "STIMULUS") continue;

      const option =
        mode === "all-correct"
          ? assessmentQuestion.question.options.find((candidate) => candidate.isCorrect)
          : assessmentQuestion.question.options.find((candidate) => !candidate.isCorrect);

      if (option) {
        await submitAnswer(assessment.id, userId, assessmentQuestion.id, {
          selectedOptionId: option.id,
        });
      }
    }
  }

  return submitAssessment(assessment.id, userId);
}

/**
 * Seeds one stimulus/recall pair for the given difficulty and archives
 * every other memory-attention question at that same difficulty, so the
 * recall question becomes the *only* candidate selectQuestions can draw
 * for that category+difficulty — making pairing/ordering assertions
 * deterministic instead of "probably happens eventually."
 */
export async function seedDeterministicStimulusRecallPair(
  difficulty: "EASY" | "MEDIUM" | "HARD",
) {
  const pair = STIMULUS_RECALL_PAIRS.find((candidate) => candidate.difficulty === difficulty);
  if (!pair) {
    throw new Error(`No stimulus/recall pair authored for difficulty ${difficulty}`);
  }

  await prisma.question.updateMany({
    where: { difficulty, category: { slug: "memory-attention" } },
    data: { status: "ARCHIVED" },
  });

  const stimulus = await createQuestion({
    questionText: pair.stimulusText,
    difficulty: pair.difficulty,
    categorySlug: pair.categorySlug,
    explanation: "Not scored.",
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

  return { stimulus, recall };
}
