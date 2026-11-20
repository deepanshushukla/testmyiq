import { prisma } from "@/lib/db/client";
import { getSystemSettingValue } from "@/lib/config/system-settings";

export const REFERRAL_THRESHOLD_SETTING_KEY = "referral_qualification_threshold";
const DEFAULT_REFERRAL_THRESHOLD = 2;

export async function getReferralThreshold(): Promise<number> {
  return getSystemSettingValue(REFERRAL_THRESHOLD_SETTING_KEY, DEFAULT_REFERRAL_THRESHOLD);
}

export async function countQualifiedReferrals(referrerUserId: string): Promise<number> {
  return prisma.referralQualification.count({
    where: { status: "QUALIFIED", referral: { referrerUserId } },
  });
}

/**
 * Read-only projection for the locked-result screen — deliberately not a
 * stored field, so it can never drift from referral_qualifications
 * (docs/REFERRAL_RULES.md §5).
 */
export async function getReferralProgress(userId: string) {
  const [qualifiedCount, threshold] = await Promise.all([
    countQualifiedReferrals(userId),
    getReferralThreshold(),
  ]);

  return { qualifiedCount, threshold };
}
