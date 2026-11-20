import { NextResponse, type NextRequest } from "next/server";
import type { LeaderboardPeriod } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/guards";
import { getLeaderboard } from "@/lib/gamification/leaderboard-read";

const VALID_PERIODS: LeaderboardPeriod[] = ["GLOBAL", "WEEKLY", "MONTHLY"];

/** No auth required — a public leaderboard is part of the product's
 * virality/SEO surface (requirement.txt Part 7). Logged-in viewers still
 * get `isCurrentUser` flagged on their own row, if they're on it. */
export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get("period") ?? "GLOBAL";
  if (!VALID_PERIODS.includes(periodParam as LeaderboardPeriod)) {
    return NextResponse.json({ error: "invalid_period" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const entries = await getLeaderboard(periodParam as LeaderboardPeriod, user?.id ?? null);

  return NextResponse.json({ period: periodParam, entries });
}
