import { Prisma, type XpReason } from "@prisma/client";
import { prisma } from "@/lib/db/client";

/**
 * Flat amounts per event (requirement.txt Part 7 gives example levels/
 * badges but no numbers — these are a documented assumption, tunable
 * later without a migration since they're just constants, not stored).
 */
export const ASSESSMENT_COMPLETED_XP = 50;
export const REFERRAL_QUALIFIED_XP = 100;

/**
 * Prevents XP farming (requirement.txt Part 7) the same way every other
 * "exactly once per event" constraint in this codebase works: a DB unique
 * constraint (`XpTransaction`'s `(userId, reason, referenceId)`) is the
 * actual guarantee, not application-level logic. `referenceId` is the
 * qualifying event's own id (an assessment id for `ASSESSMENT_COMPLETED`,
 * a referral qualification id for `REFERRAL_QUALIFIED`, an achievement id
 * for `BADGE_BONUS`) — so retaking an assessment is fine (a new
 * assessment id, a new legitimate completion) but re-processing the same
 * event never double-awards.
 */
export async function awardXp(
  userId: string,
  amount: number,
  reason: XpReason,
  referenceId: string,
): Promise<void> {
  try {
    await prisma.xpTransaction.create({
      data: { userId, amount, reason, referenceId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // already awarded for this exact event — not a farming attempt, a retry/no-op
    }
    throw error;
  }
}

export async function getXpTotal(userId: string): Promise<number> {
  const result = await prisma.xpTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
