/**
 * Swappable payment gateway abstraction (docs/ARCHITECTURE.md §1 decision
 * log — Stripe now, another gateway later needs only a new implementation
 * of this interface, never a rewrite of lib/payments/create-intent.ts or
 * webhook.ts).
 */
export type CreatePaymentIntentParams = {
  amountCents: number;
  currency: string;
  /** Client-generated, not server-generated — the same key resubmitted
   * (e.g. a double-clicked "Pay" button) must produce the same intent,
   * not two separate ones. */
  idempotencyKey: string;
  metadata: Record<string, string>;
};

export type PaymentIntentResult = {
  providerPaymentId: string;
  clientSecret: string;
};

/** Minimal shape we actually read off a provider webhook event — not the
 * full Stripe.Event type, so other gateways can map onto this without
 * depending on Stripe's SDK types. */
export type ProviderWebhookEvent = {
  id: string;
  type: string;
  objectId: string;
  paymentIntentId: string | null;
};

export interface PaymentProvider {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;

  /** Verifies the signature and parses the event. Throws on an invalid/
   * tampered signature — never returns a "maybe valid" result. Pure local
   * cryptographic verification, no network call. */
  constructWebhookEvent(rawBody: string, signatureHeader: string): ProviderWebhookEvent;
}
