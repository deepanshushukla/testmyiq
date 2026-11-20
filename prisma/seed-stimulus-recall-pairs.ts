/**
 * Delayed-recall memory/attention pairs: a STIMULUS screen (shown, not
 * scored) followed later in the same attempt by a RECALL question (scored)
 * whose correct answer depends on that exact stimulus — real delayed
 * recall, not "memorize and answer in the same breath." See
 * lib/assessment/select.ts (attachStimuli) for how the pairing/ordering
 * is enforced at selection time.
 */

export type StimulusRecallPair = {
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categorySlug: string;
  stimulusText: string;
  recallText: string;
  explanation: string;
  recallOptions: { label: string; optionText: string; isCorrect: boolean }[];
};

// Re-exported from the shared module (not redefined here) — prisma/seed.ts
// and tests/integration/helpers/assessment-fixtures.ts both still import
// these from this file's path, so this keeps that working without a
// second copy of the actual values to drift out of sync.
export { TIME_BY_DIFFICULTY, WEIGHT_BY_DIFFICULTY } from "./question-timing";

export const STIMULUS_RECALL_PAIRS: StimulusRecallPair[] = [
  {
    difficulty: "EASY",
    categorySlug: "memory-attention",
    stimulusText: "Memorize this number. You'll be asked about it in a few questions: 4 9 2.",
    recallText: "Earlier you were shown a 3-digit number. What was its second digit?",
    explanation: "The number was 492 — its digits are 4, 9, 2, so the second digit is 9.",
    recallOptions: [
      { label: "A", optionText: "4", isCorrect: false },
      { label: "B", optionText: "9", isCorrect: true },
      { label: "C", optionText: "2", isCorrect: false },
      { label: "D", optionText: "Can't recall", isCorrect: false },
    ],
  },
  {
    difficulty: "MEDIUM",
    categorySlug: "memory-attention",
    stimulusText: "Memorize this number. You'll be asked about it later: 7 3 5 1 8.",
    recallText: "Earlier you were shown a 5-digit number. What was its third digit?",
    explanation: "The number was 73518 — its digits are 7, 3, 5, 1, 8, so the third digit is 5.",
    recallOptions: [
      { label: "A", optionText: "7", isCorrect: false },
      { label: "B", optionText: "3", isCorrect: false },
      { label: "C", optionText: "5", isCorrect: true },
      { label: "D", optionText: "1", isCorrect: false },
    ],
  },
  {
    difficulty: "HARD",
    categorySlug: "memory-attention",
    stimulusText: "Memorize this number. You'll be asked about it later: 8 1 6 4 9 2 3.",
    recallText: "Earlier you were shown a 7-digit number. What was its third digit?",
    explanation:
      "The number was 8164923 — its digits are 8, 1, 6, 4, 9, 2, 3, so the third digit is 6.",
    recallOptions: [
      { label: "A", optionText: "1", isCorrect: false },
      { label: "B", optionText: "6", isCorrect: true },
      { label: "C", optionText: "4", isCorrect: false },
      { label: "D", optionText: "9", isCorrect: false },
    ],
  },
];
