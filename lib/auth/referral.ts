import type { Prisma } from "@prisma/client";

/**
 * Attributes a referral at registration time only (docs/REFERRAL_RULES.md
 * §2). Silently no-ops on an invalid code rather than blocking registration
 * — a bad referral code shouldn't be able to stop someone from signing up.
 */
export async function attributeReferral(
  tx: Prisma.TransactionClient,
  referredUserId: string,
  rawReferralCode: string | null,
): Promise<void> {
  if (!rawReferralCode) return;

  const referralCode = await tx.referralCode.findUnique({
    where: { code: rawReferralCode },
    select: { id: true, userId: true },
  });

  if (!referralCode) return;
  // Defense in depth — the DB also has a CHECK constraint on this.
  if (referralCode.userId === referredUserId) return;

  await tx.referral.create({
    data: {
      referrerUserId: referralCode.userId,
      referredUserId,
      referralCodeId: referralCode.id,
      qualification: { create: { status: "PENDING" } },
    },
  });
}
