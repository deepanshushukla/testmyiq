import type {
  CategoryBreakdown,
  DifficultyBreakdown,
  ScoringInput,
  ScoringOutput,
} from "./types";

const EMPTY_DIFFICULTY_BREAKDOWN = (): DifficultyBreakdown => ({
  EASY: { correct: 0, total: 0 },
  MEDIUM: { correct: 0, total: 0 },
  HARD: { correct: 0, total: 0 },
});

/**
 * v1 methodology — see docs/SCORING.md §2 for the full rationale:
 * - STIMULUS questions are filtered out here, defensively, even though
 *   callers should already exclude them — a scoring engine is the wrong
 *   place to trust an upstream filter silently.
 * - No penalty for wrong/unanswered answers (both contribute 0 to raw score).
 * - No speed bonus — completionTimeSeconds is reported, not scored.
 * - estimatedScore is a linear rescale of rawScore into [0, 200], where
 *   200 is "every scored question answered correctly" (maxRawScore) and
 *   100 is the midpoint — not a normed/standardized IQ score.
 */
export function scoreV1(input: ScoringInput): ScoringOutput {
  const answers = input.answers.filter((answer) => answer.kind !== "STIMULUS");

  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let rawScore = 0;
  let maxRawScore = 0;

  const difficultyBreakdown = EMPTY_DIFFICULTY_BREAKDOWN();
  const categoryBreakdown: CategoryBreakdown = {};

  for (const answer of answers) {
    maxRawScore += answer.scoringWeight;
    difficultyBreakdown[answer.difficulty].total += 1;

    const category = categoryBreakdown[answer.categoryId] ?? { correct: 0, total: 0 };
    category.total += 1;
    categoryBreakdown[answer.categoryId] = category;

    if (answer.isCorrect === true) {
      correctCount += 1;
      rawScore += answer.scoringWeight;
      difficultyBreakdown[answer.difficulty].correct += 1;
      category.correct += 1;
    } else if (answer.isCorrect === false) {
      incorrectCount += 1;
    } else {
      unansweredCount += 1;
    }
  }

  const total = answers.length;
  const accuracyPercentage = total > 0 ? (correctCount / total) * 100 : 0;
  // Midpoint default when there's nothing to score — avoids a divide-by-zero
  // while not implying either a good or bad result.
  const estimatedScore = maxRawScore > 0 ? (rawScore / maxRawScore) * 200 : 100;

  return {
    scoringVersion: "v1",
    correctCount,
    incorrectCount,
    unansweredCount,
    rawScore,
    accuracyPercentage,
    difficultyBreakdown,
    categoryBreakdown,
    completionTimeSeconds: input.completionTimeSeconds,
    estimatedScore,
  };
}
