import { NextResponse } from "next/server";
import { assertAdmin, getCurrentUser } from "@/lib/auth/guards";
import { listPaymentsForAdmin, getPaymentRevenueSummary } from "@/lib/payments/admin";
import { handlePaymentRouteError } from "@/lib/http/payment-response";

export async function GET() {
  try {
    assertAdmin(await getCurrentUser());
    const [payments, revenue] = await Promise.all([
      listPaymentsForAdmin(),
      getPaymentRevenueSummary(),
    ]);
    return NextResponse.json({ payments, revenue });
  } catch (error) {
    return handlePaymentRouteError(error);
  }
}
