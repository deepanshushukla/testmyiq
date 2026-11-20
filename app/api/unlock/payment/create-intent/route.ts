import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { createUnlockPaymentIntent } from "@/lib/payments/create-intent";
import { handlePaymentRouteError } from "@/lib/http/payment-response";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

const bodySchema = z.object({
  assessmentId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(255),
});

export async function POST(request: NextRequest) {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const ip = getClientIp(request);

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    await enforceRateLimit(`unlock-payment:ip:${ip}`, 10, 60 * 60);
    await enforceRateLimit(`unlock-payment:user:${user.id}`, 10, 60 * 60);

    const { assessmentId, idempotencyKey } = parsed.data;
    const { clientSecret, paymentId } = await createUnlockPaymentIntent(
      user.id,
      assessmentId,
      idempotencyKey,
    );

    return NextResponse.json({ clientSecret, paymentId });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    return handlePaymentRouteError(error);
  }
}
