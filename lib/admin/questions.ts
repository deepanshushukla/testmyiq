import { prisma } from "@/lib/db/client";
import {
  questionInputSchema,
  questionUpdateSchema,
  type QuestionInput,
  type QuestionUpdateInput,
} from "./schemas";

export class AdminQuestionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AdminQuestionError";
    this.code = code;
  }
}

export async function listQuestions(filters: {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  take?: number;
}) {
  return prisma.question.findMany({
    where: {
      status: filters.status,
      difficulty: filters.difficulty,
    },
    include: { options: { orderBy: { sortOrder: "asc" } }, category: true },
    orderBy: { createdAt: "desc" },
    take: filters.take ?? 100,
  });
}

export async function getQuestion(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: { options: { orderBy: { sortOrder: "asc" } }, category: true },
  });
}

async function resolveCategoryId(categorySlug: string): Promise<string> {
  const category = await prisma.questionCategory.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    throw new AdminQuestionError("unknown_category", `No category with slug "${categorySlug}"`);
  }
  return category.id;
}

async function assertValidStimulusLink(
  stimulusQuestionId: string,
  excludeRecallQuestionId?: string,
): Promise<void> {
  const stimulus = await prisma.question.findUnique({
    where: { id: stimulusQuestionId },
    include: { recallQuestion: true },
  });

  if (!stimulus) {
    throw new AdminQuestionError(
      "stimulus_not_found",
      "The referenced stimulus question does not exist",
    );
  }
  if (stimulus.kind !== "STIMULUS") {
    throw new AdminQuestionError(
      "invalid_stimulus",
      "The referenced question is not a stimulus question",
    );
  }
  if (stimulus.recallQuestion && stimulus.recallQuestion.id !== excludeRecallQuestionId) {
    throw new AdminQuestionError(
      "stimulus_already_linked",
      "This stimulus is already linked to another recall question",
    );
  }
}

export async function createQuestion(input: QuestionInput) {
  const categoryId = await resolveCategoryId(input.categorySlug);

  if (input.kind === "RECALL" && input.stimulusQuestionId) {
    await assertValidStimulusLink(input.stimulusQuestionId);
  }

  return prisma.question.create({
    data: {
      questionText: input.questionText,
      imageUrl: input.imageUrl,
      difficulty: input.difficulty,
      categoryId,
      explanation: input.explanation,
      expectedSolvingTimeSeconds: input.expectedSolvingTimeSeconds,
      scoringWeight: input.scoringWeight,
      status: "DRAFT",
      version: 1,
      kind: input.kind,
      stimulusQuestionId: input.kind === "RECALL" ? input.stimulusQuestionId : undefined,
      options: {
        create: input.options.map((option, index) => ({
          label: option.label,
          optionText: option.optionText,
          isCorrect: option.isCorrect,
          sortOrder: index,
        })),
      },
    },
    include: { options: true, category: true },
  });
}

export async function updateQuestion(id: string, input: QuestionUpdateInput) {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminQuestionError("not_found", "Question not found");
  }
  if (existing.status === "ARCHIVED") {
    throw new AdminQuestionError(
      "archived_immutable",
      "An archived question can't be edited — create a new question instead",
    );
  }

  const categoryId = input.categorySlug ? await resolveCategoryId(input.categorySlug) : undefined;
  // Editing a question that's already live bumps its version, so a
  // version pointer taken before the edit (e.g. by a future assessment
  // reference) stays meaningful — see docs/DATABASE.md §5.
  const bumpsVersion = existing.status === "PUBLISHED";

  // The incoming payload might not mention `kind` at all (not changing
  // it) — the options rule depends on the *resulting* kind, which the
  // zod schema can't see since it only has the payload, not the existing
  // row. Check it here instead, where both are available.
  const effectiveKind = input.kind ?? existing.kind;
  if (input.options && effectiveKind !== "STIMULUS") {
    const correctCount = input.options.filter((option) => option.isCorrect).length;
    if (input.options.length < 2 || correctCount !== 1) {
      throw new AdminQuestionError(
        "invalid_options",
        "A question needs at least 2 options and exactly 1 marked correct",
      );
    }
  }
  if (effectiveKind === "RECALL" && input.stimulusQuestionId) {
    await assertValidStimulusLink(input.stimulusQuestionId, id);
  }

  return prisma.$transaction(async (tx) => {
    if (input.options) {
      await tx.questionOption.deleteMany({ where: { questionId: id } });
    }

    return tx.question.update({
      where: { id },
      data: {
        questionText: input.questionText,
        imageUrl: input.imageUrl,
        difficulty: input.difficulty,
        categoryId,
        explanation: input.explanation,
        expectedSolvingTimeSeconds: input.expectedSolvingTimeSeconds,
        scoringWeight: input.scoringWeight,
        kind: input.kind,
        stimulusQuestionId: input.kind === "RECALL" ? input.stimulusQuestionId : undefined,
        version: bumpsVersion ? { increment: 1 } : undefined,
        options: input.options
          ? {
              create: input.options.map((option, index) => ({
                label: option.label,
                optionText: option.optionText,
                isCorrect: option.isCorrect,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: { options: true, category: true },
    });
  });
}

export async function publishQuestion(id: string) {
  const question = await prisma.question.findUnique({
    where: { id },
    include: { options: true, stimulusQuestion: true },
  });

  if (!question) {
    throw new AdminQuestionError("not_found", "Question not found");
  }
  if (question.status === "ARCHIVED") {
    throw new AdminQuestionError("archived_immutable", "Cannot publish an archived question");
  }

  // STIMULUS questions have no options to validate — they're never
  // scored or answered with a selection.
  if (question.kind !== "STIMULUS") {
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    if (question.options.length < 2 || correctCount !== 1) {
      throw new AdminQuestionError(
        "invalid_options",
        "A question needs at least 2 options and exactly 1 marked correct before publishing",
      );
    }
  }

  if (question.kind === "RECALL" && question.stimulusQuestion?.status !== "PUBLISHED") {
    throw new AdminQuestionError(
      "stimulus_not_published",
      "The linked stimulus question must be published first",
    );
  }

  return prisma.question.update({
    where: { id },
    data: { status: "PUBLISHED" },
    include: { options: true, category: true },
  });
}

export async function archiveQuestion(id: string) {
  const existing = await prisma.question.findUnique({
    where: { id },
    include: { recallQuestion: true },
  });
  if (!existing) {
    throw new AdminQuestionError("not_found", "Question not found");
  }

  // A RECALL question is meaningless without ever having shown its
  // STIMULUS, so archiving the stimulus cascades to its recall pair —
  // otherwise selectQuestions could draw a live recall question whose
  // stimulus never gets shown.
  if (existing.kind === "STIMULUS" && existing.recallQuestion) {
    await prisma.question.update({
      where: { id: existing.recallQuestion.id },
      data: { status: "ARCHIVED" },
    });
  }

  // Soft delete only — never a hard delete, per docs/API.md §7.
  return prisma.question.update({
    where: { id },
    data: { status: "ARCHIVED" },
    include: { options: true, category: true },
  });
}

export type BulkImportReport = {
  created: string[];
  errors: { index: number; message: string }[];
};

export async function bulkImportQuestions(rows: unknown[]): Promise<BulkImportReport> {
  const report: BulkImportReport = { created: [], errors: [] };

  for (const [index, row] of rows.entries()) {
    const parsed = questionInputSchema.safeParse(row);

    if (!parsed.success) {
      report.errors.push({ index, message: parsed.error.issues.map((i) => i.message).join("; ") });
      continue;
    }

    try {
      const created = await createQuestion(parsed.data);
      report.created.push(created.id);
    } catch (error) {
      const message = error instanceof AdminQuestionError ? error.message : "Unknown error";
      report.errors.push({ index, message });
    }
  }

  return report;
}
