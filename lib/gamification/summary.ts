import { prisma } from "@/lib/db/client";
import { getXpTotal } from "./xp";
import { getLevelForXp, getNextLevelThreshold } from "./levels";

export type GamificationSummary = {
  xpTotal: number;
  level: string;
  nextLevelThreshold: number | null;
  badges: { code: string; name: string; description: string; earnedAt: string }[];
};

/** Everything the dashboard's XP/level/badge display needs, in one call. */
export async function getGamificationSummary(userId: string): Promise<GamificationSummary> {
  const [xpTotal, userAchievements] = await Promise.all([
    getXpTotal(userId),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: "asc" },
    }),
  ]);

  return {
    xpTotal,
    level: getLevelForXp(xpTotal),
    nextLevelThreshold: getNextLevelThreshold(xpTotal),
    badges: userAchievements.map((ua) => ({
      code: ua.achievement.code,
      name: ua.achievement.name,
      description: ua.achievement.description,
      earnedAt: ua.earnedAt.toISOString(),
    })),
  };
}
