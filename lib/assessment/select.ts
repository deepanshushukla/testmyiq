import type { AssessmentTemplate, Difficulty, Question, QuestionOption } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { shuffle } from "./shuffle";
import { AssessmentError } from "./errors";

export type QuestionWithOptions = Question & { options: QuestionOption[] };

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

const COUNT_FIELD: Record<Difficulty, "easyCount" | "mediumCount" | "hardCount"> = {
  EASY: "easyCount",
  MEDIUM: "mediumCount",
  HARD: "hardCount",
};

export async function getActiveTemplate(): Promise<AssessmentTemplate> {
  const template = await prisma.assessmentTemplate.findFirst({ where: { isActive: true } });
  if (!template) {
    throw new AssessmentError("no_active_template", "No active assessment template is configured");
  }
  return template;
}

/**
 * Selects questions for one attempt: exactly the template's per-difficulty
 * counts, no duplicates, and both question order and per-category
 * composition randomized independently across attempts — including
 * retakes (spec Part 3: "maintain balanced category distribution" +
 * "randomly select questions"). The bank is sized well above what any one
 * attempt consumes specifically so this has real room to vary; see the
 * comment in prisma/seed-questions.ts for why that matters.
 *
 * Strategy: when the needed count per difficulty divides evenly across
 * the category count (true for the current template — 10 needed, 10
 * categories, 1 per category), draw exactly that many questions from
 * *each* category's pool for that difficulty — which question gets
 * chosen within each category is random, but which categories appear,
 * and how many times, is not. This guarantees balance deterministically
 * while still giving every attempt (and every retake) a different
 * concrete set of questions. If a future admin config doesn't divide
 * evenly, or some category runs short, this falls back to a plain random
 * draw across the whole difficulty pool — less strictly balanced, but
 * never blocks an attempt from starting.
 */
export async function selectQuestions(template: AssessmentTemplate): Promise<QuestionWithOptions[]> {
  const categories = await prisma.questionCategory.findMany({ select: { id: true } });
  const selected: QuestionWithOptions[] = [];

  for (const difficulty of DIFFICULTIES) {
    const needed = template[COUNT_FIELD[difficulty]];
    if (needed === 0) continue;

    // STIMULUS questions are never scored and never drawn directly — they
    // only enter an attempt via attachStimuli, pulled in by a RECALL
    // question that references them.
    const available = await prisma.question.findMany({
      where: { status: "PUBLISHED", difficulty, kind: { not: "STIMULUS" } },
      include: { options: true },
    });

    if (available.length < needed) {
      throw new AssessmentError(
        "insufficient_questions",
        `Need ${needed} published ${difficulty} questions but only ${available.length} exist`,
      );
    }

    const balancedPicks = tryBalancedDraw(available, categories, needed);
    selected.push(...(balancedPicks ?? shuffle(available).slice(0, needed)));
  }

  return attachStimuli(shuffle(selected));
}

const MIN_STIMULUS_GAP = 3;

/**
 * For every RECALL question in the draw, inserts its paired STIMULUS
 * earlier in the sequence with at least MIN_STIMULUS_GAP other questions
 * between them — otherwise "ask it later" would just mean "ask it right
 * after," which isn't a real test of memory. STIMULUS questions aren't
 * scored and don't count against any difficulty/category budget; they're
 * pure additions to whatever selectQuestions already picked.
 */
async function attachStimuli(questions: QuestionWithOptions[]): Promise<QuestionWithOptions[]> {
  const result = [...questions];
  const recalls = questions.filter((question) => question.kind === "RECALL");

  for (const recall of recalls) {
    if (!recall.stimulusQuestionId) continue;

    const stimulus = await prisma.question.findUnique({
      where: { id: recall.stimulusQuestionId },
      include: { options: true },
    });
    if (!stimulus) continue; // data integrity issue, not worth failing the whole attempt over

    const recallIndex = result.findIndex((question) => question.id === recall.id);
    const insertAt = Math.max(0, recallIndex - MIN_STIMULUS_GAP);
    result.splice(insertAt, 0, stimulus);
  }

  return result;
}

function tryBalancedDraw(
  available: QuestionWithOptions[],
  categories: { id: string }[],
  needed: number,
): QuestionWithOptions[] | null {
  if (categories.length === 0 || needed % categories.length !== 0) {
    return null;
  }

  const perCategory = needed / categories.length;
  const byCategory = new Map<string, QuestionWithOptions[]>();
  for (const question of available) {
    const pool = byCategory.get(question.categoryId) ?? [];
    pool.push(question);
    byCategory.set(question.categoryId, pool);
  }

  const picks: QuestionWithOptions[] = [];
  for (const category of categories) {
    const pool = byCategory.get(category.id) ?? [];
    if (pool.length < perCategory) {
      return null; // this category can't supply its share — fall back
    }
    picks.push(...shuffle(pool).slice(0, perCategory));
  }

  return picks;
}
