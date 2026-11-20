export type ScoringAnswer = {
  questionId: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categoryId: string;
  kind: "STANDARD" | "STIMULUS" | "RECALL";
  scoringWeight: number;
  selectedOptionId: string | null;
  isCorrect: boolean | null; // null = unanswered
};

export type ScoringInput = {
  answers: ScoringAnswer[];
  completionTimeSeconds: number;
};

export type DifficultyBreakdown = Record<"EASY" | "MEDIUM" | "HARD", { correct: number; total: number }>;
export type CategoryBreakdown = Record<string, { correct: number; total: number }>;

export type ScoringOutput = {
  scoringVersion: "v1";
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  rawScore: number;
  accuracyPercentage: number;
  difficultyBreakdown: DifficultyBreakdown;
  categoryBreakdown: CategoryBreakdown;
  completionTimeSeconds: number;
  estimatedScore: number;
};
