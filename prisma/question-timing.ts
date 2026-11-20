/**
 * Difficulty-based defaults for `expectedSolvingTimeSeconds`/`scoringWeight`
 * — the single source of truth for both, so `prisma/seed-questions.ts` and
 * `prisma/seed-stimulus-recall-pairs.ts` can't drift out of sync with each
 * other the way they previously did (each defined its own identical copy).
 * Per-question values remain individually admin-editable afterward; this
 * only governs what a newly seeded/created question defaults to.
 */
export const TIME_BY_DIFFICULTY: Record<"EASY" | "MEDIUM" | "HARD", number> = {
  EASY: 15,
  MEDIUM: 35,
  HARD: 70,
};

export const WEIGHT_BY_DIFFICULTY: Record<"EASY" | "MEDIUM" | "HARD", number> = {
  EASY: 1.0,
  MEDIUM: 1.5,
  HARD: 2.0,
};
