import { prisma } from "@/lib/db/client";
import { tryUnlockViaReferral } from "./unlock";
import { awardXp, REFERRAL_QUALIFIED_XP } from "@/lib/gamification/xp";
import { evaluateReferralBadges } from "@/lib/gamification/badges";

/**
 * Called when a referred user's assessment reaches SUBMITTED (never
 * EXPIRED — docs/REFERRAL_RULES.md §2 rule 2). No-ops entirely if this
 * user isn't actually anyone's referral. Transitions PENDING → QUALIFIED
 * only once; already-decided qualifications (QUALIFIED or DISQUALIFIED)
 * are left alone.
 */
export async function checkAndQualifyReferral(referredUserId: string): Promise<void> {
  const referral = await prisma.referral.findUnique({
    where: { referredUserId },
    include: { qualification: true, referred: true, referrer: true },
  });

  if (!referral || !referral.qualification) {
    return;
  }
  if (referral.qualification.status !== "PENDING") {
    return;
  }
  if (!referral.referred.emailVerifiedAt) {
    return;
  }

  const hasSubmittedAssessment = await prisma.assessment.findFirst({
    where: { userId: referredUserId, status: "SUBMITTED" },
  });
  if (!hasSubmittedAssessment) {
    return;
  }

  // Flag, never block (docs/REFERRAL_RULES.md §4.3) — a false positive
  // here would wrongly deny a legitimate free-unlock path.
  const flaggedSuspicious = isSameRegistrationIp(referral.referrer, referral.referred);

  const qualification = await prisma.referralQualification.update({
    where: { id: referral.qualification.id },
    data: { status: "QUALIFIED", qualifiedAt: new Date(), flaggedSuspicious },
  });

  // XP/badge go to the referrer — they're the one who benefits from
  // referring, same direction as the unlock itself.
  await awardXp(referral.referrerUserId, REFERRAL_QUALIFIED_XP, "REFERRAL_QUALIFIED", qualification.id);
  await evaluateReferralBadges(referral.referrerUserId);

  await tryUnlockViaReferral(referral.referrerUserId);
}

function isSameRegistrationIp(
  referrer: { registrationIp: string | null },
  referred: { registrationIp: string | null },
): boolean {
  return Boolean(
    referrer.registrationIp && referred.registrationIp && referrer.registrationIp === referred.registrationIp,
  );
}
