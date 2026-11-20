import { StripePaymentProvider } from "./stripe-provider";
import { PaymentError } from "./errors";
import type { PaymentProvider } from "./provider";

export type { PaymentProvider } from "./provider";
export { PaymentError } from "./errors";

let cachedProvider: PaymentProvider | null = null;

/**
 * Requires STRIPE_WEBHOOK_SECRET to construct at all — without it, even
 * webhook signature verification can't happen, so there's nothing safe to
 * do. STRIPE_SECRET_KEY may be unset (see StripePaymentProvider) — only
 * `createPaymentIntent` needs it, and fails with a clear
 * `provider_not_configured` error rather than a confusing Stripe SDK
 * error if it's missing.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new PaymentError(
      "provider_not_configured",
      "Payments aren't configured yet — STRIPE_WEBHOOK_SECRET is not set",
    );
  }

  cachedProvider = new StripePaymentProvider(process.env.STRIPE_SECRET_KEY ?? "", webhookSecret);
  return cachedProvider;
}
