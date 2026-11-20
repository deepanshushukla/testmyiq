import type { ResultAccessState } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { AssessmentError } from "@/lib/assessment/errors";
import { ensureAssessmentResult } from "./create-result";
import { getPerformanceLabel } from "@/lib/scoring/bands";

export const UNLOCKED_STATES: ResultAccessState[] = [
  "FREE_ACCESS",
  "UNLOCKED_BY_PAYMENT",
  "UNLOCKED_BY_REFERRAL",
  "RESULT_VIEWED",
];

export type LockedResultPayload = {
  status: "locked";
  resultAccessState: ResultAccessState;
  questionsAttempted: number;
  completionTimeSeconds: number;
};

export type UnlockedResultPayload = {
  status: "unlocked";
  resultAccessState: ResultAccessState;
  rawScore: number;
  accuracyPercentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  difficultyBreakdown: unknown;
  categoryBreakdown: unknown;
  completionTimeSeconds: number;
  estimatedScore: number;
  performanceLabel: string;
  scoringVersion: string;
};

/**
 * Ownership-checked. The LOCKED branch returns a payload built from an
 * explicit, separate object literal — never the full result row with
 * fields stripped — so a future field added to AssessmentResult can't
 * silently leak into a locked response (same whitelist principle as
 * lib/assessment/serialize.ts). Tested explicitly: the locked payload's
 * JSON must never contain rawScore/estimatedScore/accuracyPercentage/
 * correctCount/incorrectCount/breakdowns.
 */
export async function getResultForUser(
  assessmentId: string,
  userId: string,
): Promise<LockedResultPayload | UnlockedResultPayload> {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) {
    throw new AssessmentError("not_found", "Assessment not found");
  }
  if (assessment.userId !== userId) {
    throw new AssessmentError("forbidden", "This assessment does not belong to you");
  }
  if (assessment.status === "IN_PROGRESS" || assessment.status === "NOT_STARTED") {
    throw new AssessmentError("not_submitted", "This assessment hasn't been completed yet");
  }

  let result = await prisma.assessmentResult.findUnique({ where: { assessmentId } });
  if (!result) {
    // Defensive fallback — finalizeAssessment should have already created
    // this, but never block a result view over it being missing.
    result = await ensureAssessmentResult(assessmentId);
  }

  const isUnlocked = UNLOCKED_STATES.includes(result.resultAccessState);

  if (!isUnlocked) {
    return {
      status: "locked",
      resultAccessState: result.resultAccessState,
      questionsAttempted: result.correctCount + result.incorrectCount,
      completionTimeSeconds: result.completionTimeSeconds,
    };
  }

  if (result.resultAccessState !== "RESULT_VIEWED") {
    result = await prisma.assessmentResult.update({
      where: { assessmentId },
      data: { resultAccessState: "RESULT_VIEWED", resultViewedAt: result.resultViewedAt ?? new Date() },
    });
  }

  const estimatedScore = Number(result.estimatedScore);

  return {
    status: "unlocked",
    resultAccessState: result.resultAccessState,
    rawScore: Number(result.rawScore),
    accuracyPercentage: Number(result.accuracyPercentage),
    correctCount: result.correctCount,
    incorrectCount: result.incorrectCount,
    unansweredCount: result.unansweredCount,
    difficultyBreakdown: result.difficultyBreakdown,
    categoryBreakdown: result.categoryBreakdown,
    completionTimeSeconds: result.completionTimeSeconds,
    estimatedScore,
    performanceLabel: getPerformanceLabel(estimatedScore),
    scoringVersion: result.scoringVersion,
  };
}
