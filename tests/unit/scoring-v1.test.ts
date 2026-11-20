import { describe, expect, it } from "vitest";
import { scoreV1 } from "@/lib/scoring/v1";
import type { ScoringAnswer } from "@/lib/scoring/types";

function makeAnswer(overrides: Partial<ScoringAnswer>): ScoringAnswer {
  return {
    questionId: "q1",
    difficulty: "EASY",
    categoryId: "cat1",
    kind: "STANDARD",
    scoringWeight: 1,
    selectedOptionId: null,
    isCorrect: null,
    ...overrides,
  };
}

describe("scoreV1", () => {
  it("scores all-correct answers at the maximum", () => {
    const result = scoreV1({
      answers: [
        makeAnswer({ questionId: "q1", isCorrect: true, scoringWeight: 1 }),
        makeAnswer({ questionId: "q2", isCorrect: true, scoringWeight: 1.5, difficulty: "MEDIUM" }),
      ],
      completionTimeSeconds: 100,
    });

    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(0);
    expect(result.unansweredCount).toBe(0);
    expect(result.rawScore).toBe(2.5);
    expect(result.accuracyPercentage).toBe(100);
    expect(result.estimatedScore).toBe(200);
  });

  it("scores all-incorrect answers at zero raw score, not negative", () => {
    const result = scoreV1({
      answers: [
        makeAnswer({ questionId: "q1", isCorrect: false }),
        makeAnswer({ questionId: "q2", isCorrect: false }),
      ],
      completionTimeSeconds: 100,
    });

    expect(result.correctCount).toBe(0);
    expect(result.incorrectCount).toBe(2);
    expect(result.rawScore).toBe(0);
    expect(result.accuracyPercentage).toBe(0);
    expect(result.estimatedScore).toBe(0);
  });

  it("scores all-unanswered the same as all-incorrect for raw score, but tracks the distinction", () => {
    const result = scoreV1({
      answers: [makeAnswer({ questionId: "q1", isCorrect: null }), makeAnswer({ questionId: "q2", isCorrect: null })],
      completionTimeSeconds: 100,
    });

    expect(result.unansweredCount).toBe(2);
    expect(result.incorrectCount).toBe(0);
    expect(result.rawScore).toBe(0);
  });

  it("handles a mixed set with correct difficulty and category breakdowns", () => {
    const result = scoreV1({
      answers: [
        makeAnswer({ questionId: "q1", difficulty: "EASY", categoryId: "catA", isCorrect: true, scoringWeight: 1 }),
        makeAnswer({ questionId: "q2", difficulty: "EASY", categoryId: "catA", isCorrect: false, scoringWeight: 1 }),
        makeAnswer({ questionId: "q3", difficulty: "HARD", categoryId: "catB", isCorrect: true, scoringWeight: 2 }),
        makeAnswer({ questionId: "q4", difficulty: "HARD", categoryId: "catB", isCorrect: null, scoringWeight: 2 }),
      ],
      completionTimeSeconds: 300,
    });

    expect(result.correctCount).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.rawScore).toBe(3);
    expect(result.accuracyPercentage).toBe(50);
    expect(result.difficultyBreakdown.EASY).toEqual({ correct: 1, total: 2 });
    expect(result.difficultyBreakdown.HARD).toEqual({ correct: 1, total: 2 });
    expect(result.categoryBreakdown.catA).toEqual({ correct: 1, total: 2 });
    expect(result.categoryBreakdown.catB).toEqual({ correct: 1, total: 2 });
  });

  it("does not divide by zero on an empty answer set", () => {
    const result = scoreV1({ answers: [], completionTimeSeconds: 0 });

    expect(result.correctCount).toBe(0);
    expect(result.accuracyPercentage).toBe(0);
    expect(result.estimatedScore).toBe(100); // midpoint default, not NaN
    expect(Number.isNaN(result.estimatedScore)).toBe(false);
  });

  it("excludes STIMULUS answers from every tally, even if marked correct", () => {
    const result = scoreV1({
      answers: [
        makeAnswer({ questionId: "stim", kind: "STIMULUS", isCorrect: true, scoringWeight: 0 }),
        makeAnswer({ questionId: "recall", kind: "RECALL", isCorrect: true, scoringWeight: 2, difficulty: "HARD" }),
      ],
      completionTimeSeconds: 100,
    });

    expect(result.correctCount).toBe(1);
    expect(result.rawScore).toBe(2);
    expect(result.difficultyBreakdown.HARD.total).toBe(1);
    // No EASY/MEDIUM/HARD bucket should count the stimulus at all.
    expect(result.difficultyBreakdown.EASY.total).toBe(0);
  });

  it("is idempotent — scoring the same input twice yields identical output", () => {
    const input = {
      answers: [makeAnswer({ questionId: "q1", isCorrect: true })],
      completionTimeSeconds: 42,
    };

    expect(scoreV1(input)).toEqual(scoreV1(input));
  });
});
