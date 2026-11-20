import { Prisma, type AssessmentResult, type ResultAccessState } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { scoreV1 } from "@/lib/scoring/v1";
import type { ScoringAnswer } from "@/lib/scoring/types";
import { isEligibleForReferralUnlock } from "@/lib/referrals/unlock";

/**
 * Idempotent: if a result already exists for this assessment, returns it
 * unchanged rather than rescoring — assessment submissions are immutable
 * (docs/DATABASE.md), so there is never a legitimate reason to recompute.
 * Safe under concurrency: a race where two callers both miss the
 * existence check is caught by the DB's unique constraint on
 * assessmentId, not by this check alone.
 */
export async function ensureAssessmentResult(assessmentId: string): Promise<AssessmentResult> {
  const existing = await prisma.assessmentResult.findUnique({ where: { assessmentId } });
  if (existing) {
    return existing;
  }

  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: {
      user: { select: { isFreeTierEligible: true } },
      questions: {
        include: {
          question: { include: { options: true } },
          answer: true,
        },
      },
    },
  });

  if (!assessment.startedAt) {
    throw new Error(`Assessment ${assessmentId} has no startedAt — cannot score`);
  }

  // EXPIRED attempts are scored against the allotted deadline, not
  // against whenever a lazy auto-finalize happened to notice — otherwise
  // "completion time" would be inflated by however long the session sat
  // abandoned before anyone looked at it again.
  const effectiveEndTime =
    assessment.status === "EXPIRED" ? assessment.expiresAt : assessment.submittedAt;
  if (!effectiveEndTime) {
    throw new Error(`Assessment ${assessmentId} is not finalized — cannot score yet`);
  }
  const completionTimeSeconds = Math.round(
    (effectiveEndTime.getTime() - assessment.startedAt.getTime()) / 1000,
  );

  const answers: ScoringAnswer[] = assessment.questions.map((assessmentQuestion) => {
    const question = assessmentQuestion.question;
    const selectedOptionId = assessmentQuestion.answer?.selectedOptionId ?? null;
    const correctOption = question.options.find((option) => option.isCorrect);
    const isCorrect = selectedOptionId === null ? null : selectedOptionId === correctOption?.id;

    return {
      questionId: question.id,
      difficulty: question.difficulty,
      categoryId: question.categoryId,
      kind: question.kind,
      scoringWeight: Number(question.scoringWeight),
      selectedOptionId,
      isCorrect,
    };
  });

  const scored = scoreV1({ answers, completionTimeSeconds });

  // Priority: free-tier access, then "already qualified via referral
  // before ever taking the assessment" (docs/REFERRAL_RULES.md §3), then
  // the default LOCKED. Payment can't apply here — it only ever happens
  // after a result exists to unlock (Phase 8).
  let resultAccessState: ResultAccessState = "LOCKED";
  if (assessment.user.isFreeTierEligible) {
    resultAccessState = "FREE_ACCESS";
  } else if (await isEligibleForReferralUnlock(assessment.userId)) {
    resultAccessState = "UNLOCKED_BY_REFERRAL";
  }

  try {
    return await prisma.assessmentResult.create({
      data: {
        assessmentId,
        rawScore: scored.rawScore,
        accuracyPercentage: scored.accuracyPercentage,
        correctCount: scored.correctCount,
        incorrectCount: scored.incorrectCount,
        unansweredCount: scored.unansweredCount,
        difficultyBreakdown: scored.difficultyBreakdown,
        categoryBreakdown: scored.categoryBreakdown,
        completionTimeSeconds: scored.completionTimeSeconds,
        estimatedScore: scored.estimatedScore,
        scoringVersion: scored.scoringVersion,
        resultAccessState,
        resultUnlock:
          resultAccessState === "UNLOCKED_BY_REFERRAL"
            ? { create: { unlockMethod: "REFERRAL" } }
            : undefined,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Lost the race to a concurrent caller — their row is the real one.
      return prisma.assessmentResult.findUniqueOrThrow({ where: { assessmentId } });
    }
    throw error;
  }
}
