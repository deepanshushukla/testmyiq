import type { LeaderboardPeriod } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getMonthlyPeriodKey, getWeeklyPeriodKey } from "./leaderboard";

export type LeaderboardRow = {
  rank: number;
  xpTotal: number;
  displayName: string;
  isCurrentUser: boolean;
};

/** Never the user's email or id — this is served on a page anyone can
 * view (requirement.txt Part 7 "global leaderboard"). Falls back to a
 * stable, non-identifying label when no `displayName` was set at
 * registration (optional field). */
function getPublicDisplayName(user: { id: string; displayName: string | null }): string {
  return user.displayName ?? `Player ${user.id.slice(0, 8)}`;
}

function periodKeyFor(period: LeaderboardPeriod, now: Date): string {
  if (period === "WEEKLY") return getWeeklyPeriodKey(now);
  if (period === "MONTHLY") return getMonthlyPeriodKey(now);
  return "all";
}

export async function getLeaderboard(
  period: LeaderboardPeriod,
  viewerUserId: string | null,
  now: Date = new Date(),
): Promise<LeaderboardRow[]> {
  const periodKey = periodKeyFor(period, now);

  const entries = await prisma.leaderboardEntry.findMany({
    where: { period, periodKey },
    orderBy: { rank: "asc" },
    include: { user: { select: { id: true, displayName: true } } },
  });

  return entries.map((entry) => ({
    rank: entry.rank,
    xpTotal: entry.xpTotal,
    displayName: getPublicDisplayName(entry.user),
    isCurrentUser: entry.userId === viewerUserId,
  }));
}
