import { prisma } from "@/lib/db/client";

/**
 * Read-only transaction list for the admin payments view (spec Part 9:
 * view transactions, failures, refunds, revenue; audit payment events).
 * No refund-triggering action here — refunds happen in Stripe's dashboard
 * and reach us only as a `charge.refunded` webhook (lib/payments/webhook.ts).
 */
export async function listPaymentsForAdmin(limit = 200) {
  return prisma.payment.findMany({
    include: {
      user: { select: { id: true, email: true } },
      assessment: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getPaymentRevenueSummary() {
  const succeeded = await prisma.payment.aggregate({
    where: { status: "SUCCEEDED" },
    _sum: { amountCents: true },
    _count: true,
  });
  const refunded = await prisma.payment.aggregate({
    where: { status: "REFUNDED" },
    _sum: { amountCents: true },
    _count: true,
  });
  const failed = await prisma.payment.count({ where: { status: "FAILED" } });

  return {
    succeededCount: succeeded._count,
    succeededAmountCents: succeeded._sum.amountCents ?? 0,
    refundedCount: refunded._count,
    refundedAmountCents: refunded._sum.amountCents ?? 0,
    failedCount: failed,
    netRevenueCents: (succeeded._sum.amountCents ?? 0) - (refunded._sum.amountCents ?? 0),
  };
}
