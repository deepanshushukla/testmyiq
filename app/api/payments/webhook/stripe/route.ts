import { NextResponse, type NextRequest } from "next/server";
import { handleStripeWebhook } from "@/lib/payments/webhook";

/**
 * Stripe calls this directly — no user session, no CSRF token, and the
 * body must be read as raw text (not `request.json()`), since the
 * signature in `stripe-signature` is computed over the exact raw bytes.
 * Next.js Route Handlers don't auto-parse the body, so `request.text()`
 * already gives us the untouched payload.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    await handleStripeWebhook(rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Any failure here — bad signature, unconfigured provider, a downstream
    // DB error — must come back as non-2xx so Stripe retries delivery,
    // never a 200 that would make Stripe stop resending a real event.
    console.error(error);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 400 });
  }
}
