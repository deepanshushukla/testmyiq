import { describe, expect, it } from "vitest";
import type { Question, QuestionOption } from "@prisma/client";
import { serializePublicQuestion } from "@/lib/assessment/serialize";

const baseQuestion: Question = {
  id: "q1",
  questionText: "What is 2 + 2?",
  imageUrl: null,
  difficulty: "EASY",
  categoryId: "cat1",
  explanation: "Basic addition — a secret that must never reach the client.",
  expectedSolvingTimeSeconds: 30,
  scoringWeight: 1 as unknown as Question["scoringWeight"],
  status: "PUBLISHED",
  version: 1,
  kind: "STANDARD",
  stimulusQuestionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const options: QuestionOption[] = [
  { id: "o2", questionId: "q1", label: "B", optionText: "4", isCorrect: true, sortOrder: 1 },
  { id: "o1", questionId: "q1", label: "A", optionText: "3", isCorrect: false, sortOrder: 0 },
];

describe("serializePublicQuestion", () => {
  it("never includes isCorrect or explanation, even though both exist on the input", () => {
    const result = serializePublicQuestion({ ...baseQuestion, options });
    const json = JSON.stringify(result);

    expect(json).not.toContain("isCorrect");
    expect(json).not.toContain("explanation");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("scoringWeight");
    expect(json).not.toContain("status");
    expect(json).not.toContain("version");
  });

  it("sorts options by sortOrder regardless of input order", () => {
    const result = serializePublicQuestion({ ...baseQuestion, options });

    expect(result.options).toEqual([
      { id: "o1", label: "A", optionText: "3" },
      { id: "o2", label: "B", optionText: "4" },
    ]);
  });

  it("includes only the whitelisted fields", () => {
    const result = serializePublicQuestion({ ...baseQuestion, options });

    expect(Object.keys(result).sort()).toEqual(
      ["id", "questionText", "imageUrl", "difficulty", "categoryId", "expectedSolvingTimeSeconds", "options"].sort(),
    );
  });
});
