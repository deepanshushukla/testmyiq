import { prisma } from "@/lib/db/client";
import { AssessmentError } from "./errors";
import { autoFinalizeIfExpired } from "./submit";
import { serializeAssessmentQuestion } from "./serialize";

/**
 * Ownership-checked read of an attempt's current state, including every
 * answer given so far. The returned `expiresAt` is the only thing the
 * frontend timer should read — it is server-authoritative, not a
 * suggestion (docs/ARCHITECTURE.md §4.4).
 */
export async function getAssessmentState(assessmentId: string, userId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        include: {
          question: { include: { options: true } },
          answer: true,
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!assessment) {
    throw new AssessmentError("not_found", "Assessment not found");
  }
  if (assessment.userId !== userId) {
    throw new AssessmentError("forbidden", "This assessment does not belong to you");
  }

  const current = await autoFinalizeIfExpired(assessment);

  return {
    attemptId: current.id,
    status: current.status,
    startedAt: current.startedAt,
    expiresAt: current.expiresAt,
    submittedAt: current.submittedAt,
    questions: assessment.questions.map((assessmentQuestion) =>
      serializeAssessmentQuestion(assessmentQuestion),
    ),
  };
}
