import Link from "next/link";
import type { Metadata } from "next";
import type { LeaderboardPeriod } from "@prisma/client";
import { Breadcrumbs, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";
import { getCurrentUser } from "@/lib/auth/guards";
import { getLeaderboard } from "@/lib/gamification/leaderboard-read";

const TITLE = "Leaderboard — Top Cognitive Assessment Scores";
const DESCRIPTION =
  "See how top performers rank by XP — globally, this week, and this month. Visibility is opt-in; hide yourself anytime from your dashboard.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/leaderboard",
});

const TABS: { period: LeaderboardPeriod; label: string }[] = [
  { period: "GLOBAL", label: "All-time" },
  { period: "WEEKLY", label: "This week" },
  { period: "MONTHLY", label: "This month" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: LeaderboardPeriod = TABS.some((tab) => tab.period === periodParam)
    ? (periodParam as LeaderboardPeriod)
    : "GLOBAL";

  const user = await getCurrentUser();
  const entries = await getLeaderboard(period, user?.id ?? null);

  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/leaderboard" })} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Leaderboard", path: "/leaderboard" },
        ])}
      />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Leaderboard", href: "/leaderboard" }]} />
        <h1 className="text-2xl font-semibold text-neutral-900">Leaderboard</h1>
        <p className="text-neutral-600">
          Ranked by XP earned from completing assessments and qualifying referrals. Showing is opt-in — you
          can hide yourself from your dashboard at any time.
        </p>

        <div className="flex gap-2">
          {TABS.map((tab) => (
            <Link
              key={tab.period}
              href={`/leaderboard?period=${tab.period}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab.period === period
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <Card className="flex flex-col gap-1">
          {entries.length === 0 ? (
            <p className="text-neutral-500">No rankings yet for this period.</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm ${
                  entry.isCurrentUser ? "bg-brand-50 font-medium text-brand-900" : "text-neutral-700"
                }`}
              >
                <span>
                  #{entry.rank} {entry.displayName}
                  {entry.isCurrentUser ? " (you)" : ""}
                </span>
                <span>{entry.xpTotal} XP</span>
              </div>
            ))
          )}
        </Card>
      </main>
    </>
  );
}
