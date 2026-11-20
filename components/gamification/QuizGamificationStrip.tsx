/**
 * A motivational presence during the quiz itself — XP total so far and a
 * "answered in a row" streak derived from the live attempt. Deliberately
 * shows nothing about correctness: the live assessment API never reveals
 * `isCorrect` (docs/API.md §8), so there is nothing here to leak even by
 * accident — the streak only reflects "answered," never "answered right."
 */
export function QuizGamificationStrip({ xpTotal, streak }: { xpTotal: number; streak: number }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">⚡ {xpTotal} XP</span>
      {streak > 0 ? (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
          🔥 {streak} in a row
        </span>
      ) : null}
    </div>
  );
}
