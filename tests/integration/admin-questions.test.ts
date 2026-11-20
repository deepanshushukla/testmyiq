import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  AdminQuestionError,
  archiveQuestion,
  bulkImportQuestions,
  createQuestion,
  publishQuestion,
  updateQuestion,
} from "@/lib/admin/questions";
import type { QuestionInput } from "@/lib/admin/schemas";

async function resetDb() {
  await prisma.question.deleteMany();
  await prisma.questionCategory.deleteMany();
  await prisma.questionCategory.create({
    data: { name: "Logical Reasoning", slug: "logical-reasoning" },
  });
}

const validInput: QuestionInput = {
  questionText: "2 + 2 = ?",
  difficulty: "EASY",
  categorySlug: "logical-reasoning",
  explanation: "Basic addition",
  expectedSolvingTimeSeconds: 30,
  scoringWeight: 1,
  kind: "STANDARD",
  options: [
    { label: "A", optionText: "3", isCorrect: false },
    { label: "B", optionText: "4", isCorrect: true },
  ],
};

describe("admin question CRUD lifecycle", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a question as DRAFT with its options", async () => {
    const question = await createQuestion(validInput);
    expect(question.status).toBe("DRAFT");
    expect(question.version).toBe(1);
    expect(question.options).toHaveLength(2);
  });

  it("publishes a valid DRAFT question", async () => {
    const created = await createQuestion(validInput);
    const published = await publishQuestion(created.id);
    expect(published.status).toBe("PUBLISHED");
  });

  it("refuses to publish a question without exactly one correct option", async () => {
    const created = await createQuestion(validInput);
    await prisma.questionOption.updateMany({
      where: { questionId: created.id },
      data: { isCorrect: false },
    });

    await expect(publishQuestion(created.id)).rejects.toBeInstanceOf(AdminQuestionError);
  });

  it("archives a question as a soft delete, never a hard delete", async () => {
    const created = await createQuestion(validInput);
    const archived = await archiveQuestion(created.id);
    expect(archived.status).toBe("ARCHIVED");

    const stillExists = await prisma.question.findUnique({ where: { id: created.id } });
    expect(stillExists).not.toBeNull();
  });

  it("refuses to edit an archived question", async () => {
    const created = await createQuestion(validInput);
    await archiveQuestion(created.id);

    await expect(
      updateQuestion(created.id, { questionText: "Changed" }),
    ).rejects.toBeInstanceOf(AdminQuestionError);
  });

  it("bumps the version when editing an already-published question", async () => {
    const created = await createQuestion(validInput);
    await publishQuestion(created.id);

    const updated = await updateQuestion(created.id, { questionText: "2 + 3 = ?" });
    expect(updated.version).toBe(2);
  });

  it("does not bump the version when editing a draft question", async () => {
    const created = await createQuestion(validInput);
    const updated = await updateQuestion(created.id, { questionText: "Changed" });
    expect(updated.version).toBe(1);
  });

  describe("bulk import", () => {
    it("creates valid rows and reports errors for invalid rows without aborting the batch", async () => {
      const rows = [
        validInput,
        { ...validInput, questionText: "" },
        { ...validInput, questionText: "Another valid question" },
      ];

      const report = await bulkImportQuestions(rows);
      expect(report.created).toHaveLength(2);
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].index).toBe(1);
    });

    it("reports an error for an unknown category slug without aborting the batch", async () => {
      const rows = [validInput, { ...validInput, categorySlug: "does-not-exist" }];
      const report = await bulkImportQuestions(rows);

      expect(report.created).toHaveLength(1);
      expect(report.errors).toHaveLength(1);
    });

    it("reports an error for a row with no correct option", async () => {
      const rows = [
        {
          ...validInput,
          options: [
            { label: "A", optionText: "3", isCorrect: false },
            { label: "B", optionText: "4", isCorrect: false },
          ],
        },
      ];
      const report = await bulkImportQuestions(rows);

      expect(report.created).toHaveLength(0);
      expect(report.errors).toHaveLength(1);
    });
  });
});
