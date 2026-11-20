import { Card, ProgressBar } from "@/components/ui";
import type { UnlockedResultPayload } from "@/lib/results/access";
import { CertificateShare } from "@/components/sharing/CertificateShare";

type DifficultyBreakdown = Record<"EASY" | "MEDIUM" | "HARD", { correct: number; total: number }>;
type CategoryBreakdown = Record<string, { correct: number; total: number }>;

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function FullResult({
  result,
  categoryNames,
  assessmentId,
}: {
  result: UnlockedResultPayload;
  categoryNames: Record<string, string>;
  assessmentId: string;
}) {
  const difficultyBreakdown = result.difficultyBreakdown as DifficultyBreakdown;
  const categoryBreakdown = result.categoryBreakdown as CategoryBreakdown;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Estimated cognitive performance score
        </p>
        <p className="text-5xl font-semibold text-brand-600">
          {Math.round(result.estimatedScore)}
        </p>
        <p className="text-lg text-neutral-700">{result.performanceLabel}</p>
        <p className="max-w-md text-xs text-neutral-500">
          This is an estimated cognitive performance score, not a clinically or
          professionally validated IQ score.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-neutral-500">Accuracy</span>
          <span className="text-2xl font-medium text-neutral-900">
            {result.accuracyPercentage.toFixed(0)}%
          </span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-neutral-500">Completion time</span>
          <span className="text-2xl font-medium text-neutral-900">
            {formatDuration(result.completionTimeSeconds)}
          </span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-neutral-500">Correct / Incorrect / Unanswered</span>
          <span className="text-2xl font-medium text-neutral-900">
            {result.correctCount} / {result.incorrectCount} / {result.unansweredCount}
          </span>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-neutral-900">Performance by difficulty</h2>
        {(["EASY", "MEDIUM", "HARD"] as const).map((difficulty) => {
          const stats = difficultyBreakdown[difficulty];
          const pct = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
          return (
            <div key={difficulty} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>{difficulty}</span>
                <span>
                  {stats.correct}/{stats.total}
                </span>
              </div>
              <ProgressBar value={pct} />
            </div>
          );
        })}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-neutral-900">Performance by category</h2>
        {Object.entries(categoryBreakdown).map(([categoryId, stats]) => {
          const pct = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
          return (
            <div key={categoryId} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>{categoryNames[categoryId] ?? categoryId}</span>
                <span>
                  {stats.correct}/{stats.total}
                </span>
              </div>
              <ProgressBar value={pct} />
            </div>
          );
        })}
      </Card>

      <CertificateShare assessmentId={assessmentId} />
    </div>
  );
}
