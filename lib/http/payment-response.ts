import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { PaymentError } from "@/lib/payments/errors";

export function handlePaymentRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (error instanceof PaymentError) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "forbidden"
          ? 403
          : error.code === "provider_not_configured"
            ? 503
            : 400;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
