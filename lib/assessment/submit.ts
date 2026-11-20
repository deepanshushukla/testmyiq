import type { Assessment } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { AssessmentError } from "./errors";
import { ensureAssessmentResult } from "@/lib/results/create-result";
import { checkAndQualifyReferral } from "@/lib/referrals/qualification";
import { awardXp, ASSESSMENT_COMPLETED_XP } from "@/lib/gamification/xp";
import { evaluateAssessmentBadges } from "@/lib/gamification/badges";

/**
 * Core state transition. No ownership check — callers already have the
 * assessment loaded and verified. Idempotent: calling this on an
 * already-SUBMITTED/EXPIRED assessment is a no-op that returns the
 * existing row rather than erroring (spec Part 4: "prevent duplicate
 * submissions"). Scoring runs exactly once, right after the transition
 * commits — this is the single point every path (user submit, lazy
 * auto-finalize from state/answer/start) funnels through, so a result
 * always exists the moment an assessment leaves IN_PROGRESS.
 */
export async function finalizeAssessment(
  assessment: Assessment,
  reason: "user" | "expired",
): Promise<Assessment> {
  if (assessment.status === "SUBMITTED" || assessment.status === "EXPIRED") {
    return assessment;
  }

  if (assessment.status !== "IN_PROGRESS") {
    throw new AssessmentError(
      "invalid_state",
      `Cannot submit an assessment in status ${assessment.status}`,
    );
  }

  const updated = await prisma.assessment.update({
    where: { id: assessment.id },
    data: {
      status: reason === "expired" ? "EXPIRED" : "SUBMITTED",
      submittedAt: new Date(),
    },
  });

  const result = await ensureAssessmentResult(updated.id);

  // Referral qualification and gamification both require a real SUBMITTED
  // completion, never EXPIRED (docs/REFERRAL_RULES.md §2 rule 2; same
  // genuine-completion principle extends to XP/badges — requirement.txt
  // Part 7 "prevent XP farming" would be undermined by rewarding an
  // abandoned session) — so this only runs for genuine user-initiated
  // submits.
  if (reason === "user") {
    await checkAndQualifyReferral(updated.userId);
    await awardXp(updated.userId, ASSESSMENT_COMPLETED_XP, "ASSESSMENT_COMPLETED", updated.id);
    await evaluateAssessmentBadges(updated.userId, result);
  }

  return updated;
}

/**
 * Lazily finalizes an assessment if it's IN_PROGRESS past its deadline.
 * Called from state/answer/submit before any other logic runs, so an
 * abandoned session gets cleaned up the moment anyone next looks at it —
 * this is what makes "automatically submit when time expires" true
 * without a background job actually running. A proactive sweep job that
 * catches sessions nobody ever looks at again is a documented follow-up
 * (docs/ARCHITECTURE.md §5), not a gap in user-facing correctness.
 */
export async function autoFinalizeIfExpired(assessment: Assessment): Promise<Assessment> {
  if (
    assessment.status === "IN_PROGRESS" &&
    assessment.expiresAt &&
    assessment.expiresAt.getTime() < Date.now()
  ) {
    return finalizeAssessment(assessment, "expired");
  }
  return assessment;
}

/** Public, ownership-checked entry point for the submit API. */
export async function submitAssessment(assessmentId: string, userId: string): Promise<Assessment> {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) {
    throw new AssessmentError("not_found", "Assessment not found");
  }
  if (assessment.userId !== userId) {
    throw new AssessmentError("forbidden", "This assessment does not belong to you");
  }

  const current = await autoFinalizeIfExpired(assessment);
  return finalizeAssessment(current, "user");
}
