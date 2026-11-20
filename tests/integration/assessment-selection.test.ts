import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { selectQuestions } from "@/lib/assessment/select";
import { seedAssessmentFixtures } from "./helpers/assessment-fixtures";

describe("selectQuestions", () => {
  let template: Awaited<ReturnType<typeof seedAssessmentFixtures>>["template"];

  beforeEach(async () => {
    ({ template } = await seedAssessmentFixtures());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("selects exactly the template's per-difficulty counts, with no duplicate questions", async () => {
    const selected = await selectQuestions(template);

    expect(selected).toHaveLength(30);
    expect(selected.filter((q) => q.difficulty === "EASY")).toHaveLength(10);
    expect(selected.filter((q) => q.difficulty === "MEDIUM")).toHaveLength(10);
    expect(selected.filter((q) => q.difficulty === "HARD")).toHaveLength(10);

    const ids = selected.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws exactly 1 question per category per difficulty — deterministic balance, every time", async () => {
    // Run several times: the *counts* must be identical every time (10
    // categories × 3 per category = 30), even though which question
    // represents each category varies (checked below).
    for (let i = 0; i < 5; i += 1) {
      const selected = await selectQuestions(template);
      const categoryCounts = new Map<string, number>();

      for (const question of selected) {
        categoryCounts.set(question.categoryId, (categoryCounts.get(question.categoryId) ?? 0) + 1);
      }

      expect(categoryCounts.size).toBe(10);
      for (const count of categoryCounts.values()) {
        expect(count).toBe(3);
      }
    }
  });

  it("varies which specific question represents a category across repeated calls (retake randomness)", async () => {
    const attempts = Array.from({ length: 8 }, () => selectQuestions(template));
    const results = await Promise.all(attempts);

    const idSetsByAttempt = results.map((selected) => new Set(selected.map((q) => q.id)));
    const allIdentical = idSetsByAttempt.every(
      (set) => set.size === idSetsByAttempt[0].size && [...set].every((id) => idSetsByAttempt[0].has(id)),
    );

    // With 3 candidates per category per difficulty and a genuinely random
    // per-category draw, 8 attempts picking the exact same 30 question ids
    // every time would be astronomically unlikely if the fix is working —
    // this is the regression test for the bug the question-bank expansion
    // introduced and this file's selection logic now fixes.
    expect(allIdentical).toBe(false);
  });

  it("produces a different overall order across repeated calls", async () => {
    const first = await selectQuestions(template);
    const second = await selectQuestions(template);

    const firstOrder = first.map((q) => q.id).join(",");
    const secondOrder = second.map((q) => q.id).join(",");

    // Flaky in principle (shuffles could coincidentally match), but with
    // 30! possible orderings the odds are negligible.
    expect(firstOrder).not.toBe(secondOrder);
  });

  it("throws a clear error when the bank can't satisfy the template", async () => {
    await prisma.question.updateMany({
      where: { difficulty: "HARD" },
      data: { status: "ARCHIVED" },
    });

    await expect(selectQuestions(template)).rejects.toThrow(/insufficient_questions|HARD/);
  });
});
