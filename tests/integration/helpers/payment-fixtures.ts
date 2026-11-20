import Stripe from "stripe";
import type {
  CreatePaymentIntentParams,
  PaymentIntentResult,
  PaymentProvider,
  ProviderWebhookEvent,
} from "@/lib/payments/provider";

/**
 * Stands in for the real Stripe API call `createUnlockPaymentIntent`
 * makes — no network, deterministic `providerPaymentId` derived from the
 * idempotency key so a resubmitted key is easy to assert on. Tests that
 * need webhook signature verification use the real `StripePaymentProvider`
 * instead (see `signStripePayload` below) — that part is pure local HMAC
 * crypto and doesn't need a fake.
 */
export class FakePaymentProvider implements PaymentProvider {
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    return {
      providerPaymentId: `pi_fake_${params.idempotencyKey}`,
      clientSecret: `pi_fake_${params.idempotencyKey}_secret_test`,
    };
  }

  constructWebhookEvent(): ProviderWebhookEvent {
    throw new Error("FakePaymentProvider does not implement webhook verification");
  }
}

const signingStripe = new Stripe("sk_test_placeholder_not_a_real_key");

/**
 * Builds a real Stripe webhook payload + signature header using Stripe's
 * own offline test-signing utility (`generateTestHeaderString` is pure
 * HMAC-SHA256 over the payload — no network call, no real API key needed).
 * This lets webhook tests exercise `StripePaymentProvider.constructWebhookEvent`
 * for real instead of mocking it away.
 */
export function signStripeEvent(
  webhookSecret: string,
  type: string,
  object: { id: string; payment_intent?: string },
): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify({
    id: `evt_${object.id}`,
    object: "event",
    type,
    data: { object },
  });

  const signature = signingStripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: webhookSecret,
  });

  return { rawBody, signature };
}
