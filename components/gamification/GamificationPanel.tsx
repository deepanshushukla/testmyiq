import { Card, ProgressBar } from "@/components/ui";
import { LEVELS } from "@/lib/gamification/levels";
import type { GamificationSummary } from "@/lib/gamification/summary";
import { LeaderboardVisibilityToggle } from "./LeaderboardVisibilityToggle";

/** All six badges, earned or not — unearned ones render greyed out so
 * there's something to aim for, not just a list of what's already done. */
const ALL_BADGE_CODES = [
  "FIRST_CHALLENGE",
  "PERFECT_ACCURACY",
  "LOGIC_MASTER",
  "PATTERN_DETECTIVE",
  "CHALLENGE_CHAMPION",
  "REFERRAL_CHAMPION",
] as const;

export function GamificationPanel({
  summary,
  publicLeaderboardOptIn,
}: {
  summary: GamificationSummary;
  publicLeaderboardOptIn: boolean;
}) {
  const currentLevelIndex = LEVELS.findIndex((level) => level.name === summary.level);
  const currentLevelMinXp = LEVELS[currentLevelIndex]?.minXp ?? 0;
  const progressToNext =
    summary.nextLevelThreshold === null
      ? 100
      : ((summary.xpTotal - currentLevelMinXp) / (summary.nextLevelThreshold - currentLevelMinXp)) * 100;

  const earnedByCode = new Map(summary.badges.map((badge) => [badge.code, badge]));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">Level</p>
          <p className="text-lg font-semibold text-neutral-900">{summary.level}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-500">XP</p>
          <p className="text-lg font-semibold text-neutral-900">{summary.xpTotal}</p>
        </div>
      </div>

      <ProgressBar
        value={progressToNext}
        label={
          summary.nextLevelThreshold === null
            ? "Max level reached"
            : `${summary.xpTotal} / ${summary.nextLevelThreshold} XP to next level`
        }
      />

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-700">Badges</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ALL_BADGE_CODES.map((code) => {
            const earned = earnedByCode.get(code);
            return (
              <div
                key={code}
                title={earned ? earned.description : "Not earned yet"}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center ${
                  earned
                    ? "border-brand-200 bg-brand-50"
                    : "border-neutral-200 bg-neutral-50 opacity-50"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {earned ? "🏅" : "⬡"}
                </span>
                <span className="text-[11px] leading-tight text-neutral-700">
                  {earned?.name ?? code.replace(/_/g, " ")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <LeaderboardVisibilityToggle initialOptIn={publicLeaderboardOptIn} />
    </Card>
  );
}
