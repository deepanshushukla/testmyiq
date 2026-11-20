import type { AssessmentAnswer, Question, QuestionOption } from "@prisma/client";

type QuestionWithOptions = Question & { options: QuestionOption[] };

export type PublicQuestion = {
  id: string;
  questionText: string;
  imageUrl: string | null;
  difficulty: Question["difficulty"];
  categoryId: string;
  expectedSolvingTimeSeconds: number;
  options: { id: string; label: string; optionText: string }[];
};

/**
 * Whitelists fields explicitly rather than omitting `isCorrect`/
 * `explanation` from the source object — a whitelist can't accidentally
 * leak a field added to the Question model later; a blacklist can.
 * docs/API.md §8 requires `is_correct` and `explanation` never appear in
 * this response, enforced here and by the test in
 * tests/unit/serialize-public-question.test.ts.
 */
export function serializePublicQuestion(question: QuestionWithOptions): PublicQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    imageUrl: question.imageUrl,
    difficulty: question.difficulty,
    categoryId: question.categoryId,
    expectedSolvingTimeSeconds: question.expectedSolvingTimeSeconds,
    options: question.options
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((option) => ({ id: option.id, label: option.label, optionText: option.optionText })),
  };
}

export type SerializedAssessmentQuestion = {
  assessmentQuestionId: string;
  displayOrder: number;
  difficulty: Question["difficulty"];
  categoryId: string;
  questionText: string;
  imageUrl: string | null;
  kind: Question["kind"];
  // Purely a client-side pacing display (per-question progress bar) —
  // never a deadline the server enforces. The one deadline that's ever
  // actually enforced is the assessment-level `expires_at` (docs/
  // ARCHITECTURE.md §4), untouched by this field.
  expectedSolvingTimeSeconds: number;
  options: { id: string; label: string; optionText: string }[];
  selectedOptionId: string | null;
  markedForReview: boolean;
};

/**
 * Same whitelist principle as serializePublicQuestion, plus: options are
 * ordered by this attempt's stored `optionsOrder` (the shuffle shown to
 * *this* user), not the question's canonical `sortOrder` — so refreshing
 * mid-attempt shows a stable order instead of re-shuffling.
 */
export function serializeAssessmentQuestion(assessmentQuestion: {
  id: string;
  displayOrder: number;
  optionsOrder: unknown;
  question: QuestionWithOptions;
  answer: AssessmentAnswer | null;
}): SerializedAssessmentQuestion {
  const orderIds = Array.isArray(assessmentQuestion.optionsOrder)
    ? (assessmentQuestion.optionsOrder as string[])
    : assessmentQuestion.question.options.map((option) => option.id);

  const optionsById = new Map(
    assessmentQuestion.question.options.map((option) => [option.id, option]),
  );

  const options = orderIds
    .map((id) => optionsById.get(id))
    .filter((option): option is QuestionOption => Boolean(option))
    .map((option) => ({ id: option.id, label: option.label, optionText: option.optionText }));

  return {
    assessmentQuestionId: assessmentQuestion.id,
    displayOrder: assessmentQuestion.displayOrder,
    difficulty: assessmentQuestion.question.difficulty,
    categoryId: assessmentQuestion.question.categoryId,
    questionText: assessmentQuestion.question.questionText,
    imageUrl: assessmentQuestion.question.imageUrl,
    kind: assessmentQuestion.question.kind,
    expectedSolvingTimeSeconds: assessmentQuestion.question.expectedSolvingTimeSeconds,
    options,
    selectedOptionId: assessmentQuestion.answer?.selectedOptionId ?? null,
    markedForReview: assessmentQuestion.answer?.markedForReview ?? false,
  };
}
