import { Card, ProgressBar } from "@/components/ui";
import type { LockedResultPayload } from "@/lib/results/access";
import { buildPreUnlockShareText } from "@/lib/sharing/copy";
import { ShareSheet } from "@/components/sharing/ShareSheet";
import { ShareReferralLink } from "./ShareReferralLink";
import { UnlockWithPayment } from "./UnlockWithPayment";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function LockedResult({
  result,
  assessmentId,
  referralCode,
  referralProgress,
}: {
  result: LockedResultPayload;
  assessmentId: string;
  referralCode: string;
  referralProgress: { qualifiedCount: number; threshold: number };
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Your assessment is complete. Your results are waiting!
        </h1>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-neutral-500">Questions attempted</dt>
            <dd className="text-lg font-medium text-neutral-900">{result.questionsAttempted}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Time taken</dt>
            <dd className="text-lg font-medium text-neutral-900">
              {formatDuration(result.completionTimeSeconds)}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h2 className="text-base font-medium text-neutral-900">Unlock My Results – $1</h2>
          <p className="text-sm text-neutral-600">
            Instant unlock with a one-time $1 payment.
          </p>
          <UnlockWithPayment assessmentId={assessmentId} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-medium text-neutral-900">
            Unlock for Free – Invite 2 Friends
          </h2>
          <p className="text-sm text-neutral-600">
            Free once two friends register, verify their email, and complete their own
            assessment using your link below.
          </p>
          <ProgressBar
            value={(referralProgress.qualifiedCount / referralProgress.threshold) * 100}
            label={`${referralProgress.qualifiedCount} of ${referralProgress.threshold} friends qualified`}
          />
          <ShareReferralLink code={referralCode} />
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-medium text-neutral-900">Invite friends</h2>
        <p className="text-sm text-neutral-600">
          Share a generic invitation — your score stays hidden until you unlock it.
        </p>
        <ShareSheet path={`/r/${referralCode}`} text={buildPreUnlockShareText()} />
      </Card>
    </div>
  );
}
