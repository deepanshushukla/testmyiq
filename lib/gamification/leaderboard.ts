import type { LeaderboardPeriod } from "@prisma/client";
import { prisma } from "@/lib/db/client";

const TOP_N = 100;

/** ISO 8601 week number ("2026-W47"), so week boundaries are Monday–Sunday
 * and consistent regardless of locale. */
export function getWeeklyPeriodKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNumber + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNumber + 3);
  const weekNumber = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function getMonthlyPeriodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (d.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(d);
  start.setUTCDate(start.getUTCDate() - dayNumber);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}

function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

async function computeRankedTotals(
  createdAtRange?: { gte: Date; lt: Date },
): Promise<{ userId: string; xpTotal: number }[]> {
  const grouped = await prisma.xpTransaction.groupBy({
    by: ["userId"],
    where: createdAtRange ? { createdAt: createdAtRange } : undefined,
    _sum: { amount: true },
  });

  const optedIn = new Set(
    (
      await prisma.user.findMany({
        where: { id: { in: grouped.map((g) => g.userId) }, publicLeaderboardOptIn: true },
        select: { id: true },
      })
    ).map((u) => u.id),
  );

  return grouped
    .filter((g) => optedIn.has(g.userId))
    .map((g) => ({ userId: g.userId, xpTotal: g._sum.amount ?? 0 }))
    .sort((a, b) => b.xpTotal - a.xpTotal)
    .slice(0, TOP_N);
}

/**
 * Full delete-and-rebuild per `(period, periodKey)` — simpler and more
 * robust than incremental updates, and the only way to guarantee a user
 * who just opted out of `publicLeaderboardOptIn` disappears from a stale
 * entry rather than lingering until their XP changes again. `DB remains
 * source of truth` (docs/ARCHITECTURE.md §1) — `xp_transactions` is what's
 * actually summed each time, `leaderboard_entries` is just the materialized
 * snapshot these reads are served from.
 */
export async function recomputeLeaderboards(now: Date = new Date()): Promise<void> {
  const week = getWeekBounds(now);
  const month = getMonthBounds(now);

  const periods: { period: LeaderboardPeriod; periodKey: string; range?: { gte: Date; lt: Date } }[] = [
    { period: "GLOBAL", periodKey: "all" },
    { period: "WEEKLY", periodKey: getWeeklyPeriodKey(now), range: { gte: week.start, lt: week.end } },
    { period: "MONTHLY", periodKey: getMonthlyPeriodKey(now), range: { gte: month.start, lt: month.end } },
  ];

  for (const { period, periodKey, range } of periods) {
    const ranked = await computeRankedTotals(range);

    await prisma.$transaction([
      prisma.leaderboardEntry.deleteMany({ where: { period, periodKey } }),
      ...ranked.map((entry, index) =>
        prisma.leaderboardEntry.create({
          data: { userId: entry.userId, period, periodKey, xpTotal: entry.xpTotal, rank: index + 1 },
        }),
      ),
    ]);
  }
}
