import { prisma } from "@/lib/db/client";
import { ReferralError } from "./errors";

export async function listReferralsForAdmin() {
  return prisma.referral.findMany({
    include: {
      referrer: { select: { id: true, email: true } },
      referred: { select: { id: true, email: true } },
      qualification: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

/**
 * Admin-only, audited (docs/REFERRAL_RULES.md §2) — for genuine
 * retroactive fraud findings, not a general reversal mechanism. Does
 * **not** revoke any unlock the referral already contributed to; it only
 * stops the referral from counting toward *future* thresholds
 * ("existing qualified referrals must never be lost").
 */
export async function disqualifyReferral(
  qualificationId: string,
  adminUserId: string,
  reason: string,
) {
  const qualification = await prisma.referralQualification.findUnique({
    where: { id: qualificationId },
  });
  if (!qualification) {
    throw new ReferralError("not_found", "Referral qualification not found");
  }
  if (qualification.status === "DISQUALIFIED") {
    return qualification;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.referralQualification.update({
      where: { id: qualificationId },
      data: { status: "DISQUALIFIED", disqualifiedReason: reason },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: "REFERRAL_DISQUALIFIED",
        entityType: "ReferralQualification",
        entityId: qualificationId,
        metadata: { reason, previousStatus: qualification.status },
      },
    });

    return updated;
  });
}
