import { Prisma, type AssessmentResult } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { countQualifiedReferrals, getReferralThreshold } from "@/lib/referrals/progress";
import { awardXp } from "./xp";

/**
 * requirement.txt Part 7 example badges. Earning conditions and bonus XP
 * are a documented assumption — the spec names the badges, not how to
 * earn them. Codes are the stable identifier (seeded into `Achievement`
 * by `prisma/seed.ts`, which imports this same const — single source of
 * truth for name/description, same pattern as `QUESTION_CATEGORIES`).
 */
export const BADGE_DEFINITIONS = {
  FIRST_CHALLENGE: {
    name: "First Challenge",
    description: "Completed your first assessment.",
    xpBonus: 20,
  },
  PERFECT_ACCURACY: {
    name: "Perfect Accuracy",
    description: "Scored 100% accuracy on an assessment.",
    xpBonus: 50,
  },
  LOGIC_MASTER: {
    name: "Logic Master",
    description: "Answered every logical reasoning question correctly in one assessment.",
    xpBonus: 30,
  },
  PATTERN_DETECTIVE: {
    name: "Pattern Detective",
    description: "Answered every pattern recognition question correctly in one assessment.",
    xpBonus: 30,
  },
  CHALLENGE_CHAMPION: {
    name: "Challenge Champion",
    description: "Completed 5 assessments.",
    xpBonus: 75,
  },
  REFERRAL_CHAMPION: {
    name: "Referral Champion",
    description: "Qualified enough referrals to unlock a result for free.",
    xpBonus: 100,
  },
} as const;

export type BadgeCode = keyof typeof BADGE_DEFINITIONS;

const CHALLENGE_CHAMPION_COUNT = 5;

/** Idempotent: `UserAchievement`'s `(userId, achievementId)` unique
 * constraint means re-evaluating an already-earned badge is a no-op, not
 * a duplicate award or duplicate bonus XP. */
async function awardBadge(userId: string, code: BadgeCode): Promise<void> {
  const achievement = await prisma.achievement.findUniqueOrThrow({ where: { code } });

  try {
    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // already earned
    }
    throw error;
  }

  await awardXp(userId, BADGE_DEFINITIONS[code].xpBonus, "BADGE_BONUS", achievement.id);
}

/** Perfect (all-correct) performance within one category, scoped to
 * questions actually present in this assessment (not all 10 categories
 * appear in every template necessarily) — reads `categoryBreakdown`,
 * keyed by category id, the same shape `lib/scoring/v1.ts` produces. */
async function hasPerfectCategory(
  categoryBreakdown: unknown,
  categorySlug: string,
): Promise<boolean> {
  const category = await prisma.questionCategory.findUnique({ where: { slug: categorySlug } });
  if (!category) return false;

  const breakdown = categoryBreakdown as Record<string, { total: number; correct: number }> | null;
  const entry = breakdown?.[category.id];
  return Boolean(entry && entry.total > 0 && entry.correct === entry.total);
}

/**
 * Called from `lib/assessment/submit.ts` `finalizeAssessment`, only for a
 * genuine user-initiated submit (never `EXPIRED` — same
 * genuine-completion distinction Phase 7 draws for referral
 * qualification). Evaluates every assessment-triggered badge; each award
 * is independently idempotent, so calling this more than once for the
 * same assessment (shouldn't happen, but isn't catastrophic if it did)
 * never double-awards.
 */
export async function evaluateAssessmentBadges(
  userId: string,
  result: AssessmentResult,
): Promise<void> {
  const submittedCount = await prisma.assessment.count({
    where: { userId, status: "SUBMITTED" },
  });

  if (submittedCount >= 1) {
    await awardBadge(userId, "FIRST_CHALLENGE");
  }
  if (submittedCount >= CHALLENGE_CHAMPION_COUNT) {
    await awardBadge(userId, "CHALLENGE_CHAMPION");
  }
  if (Number(result.accuracyPercentage) === 100) {
    await awardBadge(userId, "PERFECT_ACCURACY");
  }
  if (await hasPerfectCategory(result.categoryBreakdown, "logical-reasoning")) {
    await awardBadge(userId, "LOGIC_MASTER");
  }
  if (await hasPerfectCategory(result.categoryBreakdown, "pattern-recognition")) {
    await awardBadge(userId, "PATTERN_DETECTIVE");
  }
}

/** Called from `lib/referrals/qualification.ts` right after a referral
 * qualifies, for the *referrer* — mirrors `tryUnlockViaReferral`'s
 * "reached the threshold" check. */
export async function evaluateReferralBadges(referrerUserId: string): Promise<void> {
  const [qualifiedCount, threshold] = await Promise.all([
    countQualifiedReferrals(referrerUserId),
    getReferralThreshold(),
  ]);

  if (qualifiedCount >= threshold) {
    await awardBadge(referrerUserId, "REFERRAL_CHAMPION");
  }
}
