import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { awardXp, getXpTotal } from "@/lib/gamification/xp";
import { getGamificationSummary } from "@/lib/gamification/summary";
import { getLeaderboard } from "@/lib/gamification/leaderboard-read";
import { recomputeLeaderboards, getWeeklyPeriodKey, getMonthlyPeriodKey } from "@/lib/gamification/leaderboard";
import { evaluateAssessmentBadges } from "@/lib/gamification/badges";
import { getOrCreateReferralCode } from "@/lib/referrals/code";
import {
  createVerifiedUser,
  seedAssessmentFixtures,
  startAndSubmitAssessment,
} from "./helpers/assessment-fixtures";
import { exhaustFreeTierCap, registerAndVerifyUser } from "./helpers/referral-fixtures";

async function earnedBadgeCodes(userId: string): Promise<string[]> {
  const rows = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });
  return rows.map((row) => row.achievement.code);
}

describe("gamification", () => {
  beforeEach(async () => {
    await seedAssessmentFixtures();
    await exhaustFreeTierCap();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("awardXp", () => {
    it("is idempotent for the same (userId, reason, referenceId) — prevents XP farming", async () => {
      const user = await createVerifiedUser("xp-idempotent@example.com");

      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "ref-1");
      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "ref-1");
      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "ref-1");

      expect(await getXpTotal(user.id)).toBe(50);
      const count = await prisma.xpTransaction.count({ where: { userId: user.id } });
      expect(count).toBe(1);
    });

    it("awards independently for different reference ids (e.g. legitimate retakes)", async () => {
      const user = await createVerifiedUser("xp-retake@example.com");
      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "ref-1");
      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "ref-2");

      expect(await getXpTotal(user.id)).toBe(100);
    });
  });

  describe("assessment-completion hook (lib/assessment/submit.ts)", () => {
    it("awards ASSESSMENT_COMPLETED XP and the First Challenge badge (+ its bonus XP) on a genuine submit", async () => {
      const user = await createVerifiedUser("first-challenge@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");

      const transaction = await prisma.xpTransaction.findUniqueOrThrow({
        where: { userId_reason_referenceId: { userId: user.id, reason: "ASSESSMENT_COMPLETED", referenceId: assessment.id } },
      });
      expect(transaction.amount).toBe(50);

      const badges = await earnedBadgeCodes(user.id);
      expect(badges).toContain("FIRST_CHALLENGE");
      // 50 (completion) + 20 (First Challenge bonus) — every first-ever
      // submit earns this badge regardless of accuracy.
      expect(await getXpTotal(user.id)).toBe(70);
    });

    it("awards no XP or badges for an EXPIRED (abandoned) assessment", async () => {
      const user = await createVerifiedUser("expired-no-xp@example.com");
      const template = await prisma.assessmentTemplate.findFirstOrThrow();
      await prisma.assessment.create({
        data: {
          userId: user.id,
          templateId: template.id,
          status: "EXPIRED",
          startedAt: new Date(Date.now() - 2000),
          expiresAt: new Date(Date.now() - 1000),
          submittedAt: new Date(),
        },
      });

      expect(await getXpTotal(user.id)).toBe(0);
      expect(await earnedBadgeCodes(user.id)).toHaveLength(0);
    });

    it("awards Perfect Accuracy, Logic Master, and Pattern Detective on a flawless assessment", async () => {
      const user = await createVerifiedUser("perfect@example.com");
      await startAndSubmitAssessment(user.id, "all-correct");

      const badges = await earnedBadgeCodes(user.id);
      expect(badges).toContain("PERFECT_ACCURACY");
      expect(badges).toContain("LOGIC_MASTER");
      expect(badges).toContain("PATTERN_DETECTIVE");
    });

    it("does not award Perfect Accuracy/Logic Master/Pattern Detective on an all-incorrect assessment", async () => {
      const user = await createVerifiedUser("imperfect@example.com");
      await startAndSubmitAssessment(user.id, "all-incorrect");

      const badges = await earnedBadgeCodes(user.id);
      expect(badges).not.toContain("PERFECT_ACCURACY");
      expect(badges).not.toContain("LOGIC_MASTER");
      expect(badges).not.toContain("PATTERN_DETECTIVE");
    });

    it("awards Challenge Champion only on the 5th completed assessment, not before", async () => {
      const user = await createVerifiedUser("champion@example.com");
      for (let i = 0; i < 4; i++) {
        await startAndSubmitAssessment(user.id, "all-incorrect");
      }
      expect(await earnedBadgeCodes(user.id)).not.toContain("CHALLENGE_CHAMPION");

      await startAndSubmitAssessment(user.id, "all-incorrect");
      expect(await earnedBadgeCodes(user.id)).toContain("CHALLENGE_CHAMPION");
    });

    it("badge awards are idempotent and never double-award bonus XP", async () => {
      const user = await createVerifiedUser("badge-idempotent@example.com");
      await startAndSubmitAssessment(user.id, "all-correct");
      const xpAfterFirst = await getXpTotal(user.id);

      // Re-evaluate badges for the same already-earned state directly —
      // simulates a retried hook call, not a second legitimate assessment.
      const result = await prisma.assessmentResult.findFirstOrThrow({
        where: { assessment: { userId: user.id } },
      });
      await evaluateAssessmentBadges(user.id, result);
      await evaluateAssessmentBadges(user.id, result);

      expect(await getXpTotal(user.id)).toBe(xpAfterFirst);
      const badgeCount = await prisma.userAchievement.count({ where: { userId: user.id } });
      const distinctBadges = new Set(await earnedBadgeCodes(user.id));
      expect(badgeCount).toBe(distinctBadges.size); // no duplicate rows
    });
  });

  describe("referral-qualification hook (lib/referrals/qualification.ts)", () => {
    it("awards REFERRAL_QUALIFIED XP and Referral Champion to the referrer at the threshold", async () => {
      const referrer = await createVerifiedUser("referral-xp@example.com");
      const code = await getOrCreateReferralCode(referrer.id);

      const friend1 = await registerAndVerifyUser("referral-xp-friend1@example.com", { referralCode: code });
      await startAndSubmitAssessment(friend1.id, "all-correct");
      expect(await earnedBadgeCodes(referrer.id)).not.toContain("REFERRAL_CHAMPION");

      const friend2 = await registerAndVerifyUser("referral-xp-friend2@example.com", { referralCode: code });
      await startAndSubmitAssessment(friend2.id, "all-correct");

      const referrerXp = await getXpTotal(referrer.id);
      // 2 qualified referrals × 100 XP + Referral Champion's 100 XP bonus,
      // plus whatever the referrer's own assessment (if any) earned — none
      // taken here, so it's exactly the referral-driven XP.
      expect(referrerXp).toBe(300);
      expect(await earnedBadgeCodes(referrer.id)).toContain("REFERRAL_CHAMPION");
    });
  });

  describe("getGamificationSummary", () => {
    it("reports xp total, level, and earned badges", async () => {
      const user = await createVerifiedUser("summary@example.com");
      await startAndSubmitAssessment(user.id, "all-correct");

      const summary = await getGamificationSummary(user.id);
      // 50 (completion) + 20 + 50 + 30 + 30 (4 badge bonuses) = 180, which
      // crosses the Explorer threshold (150).
      expect(summary.xpTotal).toBe(180);
      expect(summary.level).toBe("Explorer");
      expect(summary.badges.map((b) => b.code)).toEqual(
        expect.arrayContaining(["FIRST_CHALLENGE", "PERFECT_ACCURACY", "LOGIC_MASTER", "PATTERN_DETECTIVE"]),
      );
    });
  });

  describe("recomputeLeaderboards", () => {
    it("ranks users by XP descending", async () => {
      const low = await createVerifiedUser("rank-low@example.com");
      const high = await createVerifiedUser("rank-high@example.com");
      await awardXp(low.id, 50, "ASSESSMENT_COMPLETED", "a1");
      await awardXp(high.id, 200, "ASSESSMENT_COMPLETED", "a2");

      await recomputeLeaderboards();

      const entries = await getLeaderboard("GLOBAL", null);
      const highRow = entries.find((e) => e.xpTotal === 200);
      const lowRow = entries.find((e) => e.xpTotal === 50);
      expect(highRow?.rank).toBeLessThan(lowRow?.rank ?? Infinity);
    });

    it("excludes a user who has opted out of the public leaderboard", async () => {
      const visible = await createVerifiedUser("visible@example.com");
      const hidden = await createVerifiedUser("hidden@example.com");
      await prisma.user.update({ where: { id: hidden.id }, data: { publicLeaderboardOptIn: false } });

      await awardXp(visible.id, 50, "ASSESSMENT_COMPLETED", "v1");
      await awardXp(hidden.id, 999, "ASSESSMENT_COMPLETED", "h1");

      await recomputeLeaderboards();

      const entries = await getLeaderboard("GLOBAL", null);
      expect(entries.find((e) => e.xpTotal === 999)).toBeUndefined();
      expect(entries.find((e) => e.xpTotal === 50)).toBeDefined();
    });

    it("a user who opts out after being ranked disappears on the next recompute", async () => {
      const user = await createVerifiedUser("opt-out-after@example.com");
      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "o1");
      await recomputeLeaderboards();
      expect((await getLeaderboard("GLOBAL", null)).some((e) => e.xpTotal === 50)).toBe(true);

      await prisma.user.update({ where: { id: user.id }, data: { publicLeaderboardOptIn: false } });
      await recomputeLeaderboards();
      expect((await getLeaderboard("GLOBAL", null)).some((e) => e.xpTotal === 50)).toBe(false);
    });

    it("WEEKLY and MONTHLY only count XP earned within the current period", async () => {
      const user = await createVerifiedUser("period-scoped@example.com");
      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "recent");
      // Backdate a second transaction to well outside this week/month.
      await prisma.xpTransaction.create({
        data: {
          userId: user.id,
          amount: 500,
          reason: "ASSESSMENT_COMPLETED",
          referenceId: "ancient",
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        },
      });

      await recomputeLeaderboards();

      const weekly = await getLeaderboard("WEEKLY", null);
      const monthly = await getLeaderboard("MONTHLY", null);
      const global = await getLeaderboard("GLOBAL", null);

      expect(weekly.find((e) => e.displayName.includes(user.id.slice(0, 8)))?.xpTotal).toBe(50);
      expect(monthly.find((e) => e.displayName.includes(user.id.slice(0, 8)))?.xpTotal).toBe(50);
      expect(global.find((e) => e.displayName.includes(user.id.slice(0, 8)))?.xpTotal).toBe(550);
    });

    it("flags isCurrentUser for the viewer's own row", async () => {
      const user = await createVerifiedUser("viewer@example.com");
      await awardXp(user.id, 50, "ASSESSMENT_COMPLETED", "v1");
      await recomputeLeaderboards();

      const entries = await getLeaderboard("GLOBAL", user.id);
      expect(entries.find((e) => e.xpTotal === 50)?.isCurrentUser).toBe(true);
    });
  });

  describe("period key helpers", () => {
    it("produce stable, well-formed keys", () => {
      const date = new Date("2026-11-20T12:00:00Z");
      expect(getWeeklyPeriodKey(date)).toMatch(/^\d{4}-W\d{2}$/);
      expect(getMonthlyPeriodKey(date)).toBe("2026-11");
    });
  });
});
