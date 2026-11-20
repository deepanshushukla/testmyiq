import type { Metadata } from "next";
import { listPaymentsForAdmin, getPaymentRevenueSummary } from "@/lib/payments/admin";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AdminPaymentsPage() {
  const [payments, revenue] = await Promise.all([
    listPaymentsForAdmin(),
    getPaymentRevenueSummary(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Payments</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-neutral-500">Net revenue</p>
          <p className="text-lg font-medium text-neutral-900">
            {formatCents(revenue.netRevenueCents)}
          </p>
          <p className="text-xs text-neutral-500">{revenue.succeededCount} succeeded</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Refunded</p>
          <p className="text-lg font-medium text-neutral-900">
            {formatCents(revenue.refundedAmountCents)}
          </p>
          <p className="text-xs text-neutral-500">{revenue.refundedCount} refunds</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral-500">Failed</p>
          <p className="text-lg font-medium text-neutral-900">{revenue.failedCount}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        {payments.map((payment) => (
          <Card key={payment.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-neutral-900">
                {payment.user.email} · {formatCents(payment.amountCents)}
              </p>
              <p className="text-sm text-neutral-500">
                {payment.status} · {payment.provider} · {payment.createdAt.toISOString().slice(0, 10)}
                {payment.providerPaymentId ? ` · ${payment.providerPaymentId}` : ""}
              </p>
            </div>
          </Card>
        ))}
        {payments.length === 0 ? <p className="text-neutral-500">No payments yet.</p> : null}
      </div>
    </div>
  );
}
