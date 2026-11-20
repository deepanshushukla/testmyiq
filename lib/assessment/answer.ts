import { prisma } from "@/lib/db/client";
import { AssessmentError } from "./errors";
import { autoFinalizeIfExpired } from "./submit";

/**
 * Persists one answer incrementally. Rejects the write if the assessment
 * is not currently IN_PROGRESS — including the moment it's discovered to
 * be expired, which this function finalizes lazily before checking, so a
 * write that lands one tick past the deadline is rejected, not accepted.
 */
export async function submitAnswer(
  assessmentId: string,
  userId: string,
  assessmentQuestionId: string,
  input: { selectedOptionId?: string | null; markedForReview?: boolean },
) {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) {
    throw new AssessmentError("not_found", "Assessment not found");
  }
  if (assessment.userId !== userId) {
    throw new AssessmentError("forbidden", "This assessment does not belong to you");
  }

  const current = await autoFinalizeIfExpired(assessment);
  if (current.status !== "IN_PROGRESS") {
    throw new AssessmentError("expired", "This assessment is no longer accepting answers");
  }

  const assessmentQuestion = await prisma.assessmentQuestion.findUnique({
    where: { id: assessmentQuestionId },
    include: { question: { select: { kind: true } } },
  });
  if (!assessmentQuestion || assessmentQuestion.assessmentId !== assessmentId) {
    throw new AssessmentError("not_found", "Question not found in this assessment");
  }

  if (input.selectedOptionId) {
    if (assessmentQuestion.question.kind === "STIMULUS") {
      throw new AssessmentError(
        "invalid_option",
        "A stimulus screen has nothing to select — just continue past it",
      );
    }
    const validOption = await prisma.questionOption.findFirst({
      where: { id: input.selectedOptionId, questionId: assessmentQuestion.questionId },
    });
    if (!validOption) {
      throw new AssessmentError("invalid_option", "That option does not belong to this question");
    }
  }

  return prisma.assessmentAnswer.upsert({
    where: { assessmentQuestionId },
    create: {
      assessmentQuestionId,
      selectedOptionId: input.selectedOptionId ?? null,
      markedForReview: input.markedForReview ?? false,
    },
    update: {
      selectedOptionId: input.selectedOptionId,
      markedForReview: input.markedForReview,
      answeredAt: new Date(),
    },
  });
}
