import type { Metadata } from "next";
import { listReferralsForAdmin } from "@/lib/referrals/admin";
import { Card } from "@/components/ui";
import { DisqualifyButton } from "./DisqualifyButton";

export const metadata: Metadata = {
  title: "Referrals",
  robots: { index: false, follow: false },
};

export default async function AdminReferralsPage() {
  const referrals = await listReferralsForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Referrals</h1>

      <div className="flex flex-col gap-2">
        {referrals.map((referral) => {
          const status = referral.qualification?.status ?? "PENDING";
          const flagged = referral.qualification?.flaggedSuspicious;

          return (
            <Card key={referral.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-neutral-900">
                  {referral.referrer.email} → {referral.referred.email}
                </p>
                <p className="text-sm text-neutral-500">
                  {status}
                  {flagged ? " · flagged (same registration IP)" : ""}
                  {referral.qualification?.qualifiedAt
                    ? ` · qualified ${referral.qualification.qualifiedAt.toISOString().slice(0, 10)}`
                    : ""}
                  {referral.qualification?.disqualifiedReason
                    ? ` · reason: ${referral.qualification.disqualifiedReason}`
                    : ""}
                </p>
              </div>
              {status === "QUALIFIED" && referral.qualification ? (
                <DisqualifyButton qualificationId={referral.qualification.id} />
              ) : null}
            </Card>
          );
        })}
        {referrals.length === 0 ? <p className="text-neutral-500">No referrals yet.</p> : null}
      </div>
    </div>
  );
}
