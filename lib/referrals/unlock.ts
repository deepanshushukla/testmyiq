import { Prisma, type ResultAccessState } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { countQualifiedReferrals, getReferralThreshold } from "./progress";

const LOCKED_STATES: ResultAccessState[] = ["LOCKED", "REFERRAL_PENDING", "PAYMENT_PENDING"];

/**
 * Unlocks the referrer's most recent still-locked result via referral, if
 * they've reached the qualification threshold. Called from two places
 * (docs/REFERRAL_RULES.md §3): right after a referral qualifies, and at
 * AssessmentResult creation time (in case the referrer already had enough
 * qualified referrals before they ever took their own assessment). A
 * no-op if the referrer has no result yet, or nothing left to unlock.
 *
 * Idempotent: the DB's unique constraint on `ResultUnlock.assessmentResultId`
 * makes a duplicate call a no-op even under a race, not an error.
 */
export async function tryUnlockViaReferral(referrerUserId: string): Promise<void> {
  const [qualifiedCount, threshold] = await Promise.all([
    countQualifiedReferrals(referrerUserId),
    getReferralThreshold(),
  ]);

  if (qualifiedCount < threshold) {
    return;
  }

  // If a user has retaken the assessment, only the most recent attempt's
  // result is the one that matters to them — not an original design
  // consideration in docs/REFERRAL_RULES.md (written before retakes were
  // allowed in Phase 5), so this is a deliberate, documented call.
  const result = await prisma.assessmentResult.findFirst({
    where: {
      assessment: { userId: referrerUserId },
      resultAccessState: { in: LOCKED_STATES },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!result) {
    return;
  }

  try {
    await prisma.$transaction([
      prisma.assessmentResult.update({
        where: { id: result.id },
        data: { resultAccessState: "UNLOCKED_BY_REFERRAL" },
      }),
      prisma.resultUnlock.create({
        data: { assessmentResultId: result.id, unlockMethod: "REFERRAL" },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // already unlocked by a concurrent call
    }
    throw error;
  }
}

/**
 * Used by result-creation time: is this user already eligible to have
 * their brand-new result unlocked immediately, before LOCKED is ever
 * written? Pure read, no side effects.
 */
export async function isEligibleForReferralUnlock(userId: string): Promise<boolean> {
  const [qualifiedCount, threshold] = await Promise.all([
    countQualifiedReferrals(userId),
    getReferralThreshold(),
  ]);
  return qualifiedCount >= threshold;
}
