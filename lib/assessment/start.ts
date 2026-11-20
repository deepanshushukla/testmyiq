import type { Assessment } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getActiveTemplate, selectQuestions } from "./select";
import { shuffle } from "./shuffle";
import { autoFinalizeIfExpired } from "./submit";

/**
 * Returns the caller's existing IN_PROGRESS assessment if one exists
 * (resumable — refreshing the browser must never reset the timer or
 * start a second attempt), auto-finalizing it first if it's actually
 * already past its deadline. Otherwise starts a brand new one from the
 * active template.
 */
export async function startOrResumeAssessment(userId: string): Promise<Assessment> {
  const existing = await prisma.assessment.findFirst({
    where: { userId, status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const current = await autoFinalizeIfExpired(existing);
    if (current.status === "IN_PROGRESS") {
      return current;
    }
    // Otherwise it just got auto-finalized for expiry — fall through to
    // start a fresh attempt.
  }

  const template = await getActiveTemplate();
  const questions = await selectQuestions(template);

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + template.durationMinutes * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        userId,
        templateId: template.id,
        status: "IN_PROGRESS",
        startedAt,
        expiresAt,
      },
    });

    for (const [displayOrder, question] of questions.entries()) {
      const optionsOrder = shuffle(question.options.map((option) => option.id));
      await tx.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          questionId: question.id,
          displayOrder,
          optionsOrder,
        },
      });
    }

    return assessment;
  });
}
