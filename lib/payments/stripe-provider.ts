import Stripe from "stripe";
import { PaymentError } from "./errors";
import type {
  CreatePaymentIntentParams,
  PaymentIntentResult,
  PaymentProvider,
  ProviderWebhookEvent,
} from "./provider";

export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly hasRealSecretKey: boolean;

  /**
   * `secretKey` may be empty — webhook verification only needs
   * `webhookSecret` (pure local crypto, no API call), so a dev
   * environment without a Stripe account yet can still exercise the
   * entire webhook/idempotency/unlock path for real. Only
   * `createPaymentIntent`, which actually calls Stripe's API, needs a
   * real key — it fails fast with a clear error instead of letting the
   * Stripe SDK make a doomed network call with a bogus key.
   */
  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey || "sk_test_placeholder_not_a_real_key");
    this.webhookSecret = webhookSecret;
    this.hasRealSecretKey = Boolean(secretKey);
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    if (!this.hasRealSecretKey) {
      throw new PaymentError(
        "provider_not_configured",
        "Payments aren't configured yet — STRIPE_SECRET_KEY is not set",
      );
    }

    const intent = await this.stripe.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency,
        metadata: params.metadata,
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: params.idempotencyKey },
    );

    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client secret for the created PaymentIntent");
    }

    return { providerPaymentId: intent.id, clientSecret: intent.client_secret };
  }

  constructWebhookEvent(rawBody: string, signatureHeader: string): ProviderWebhookEvent {
    // Throws Stripe.errors.StripeSignatureVerificationError on an
    // invalid/tampered signature — pure local HMAC check, no network call.
    const event = this.stripe.webhooks.constructEvent(rawBody, signatureHeader, this.webhookSecret);

    const object = event.data.object as { id: string; payment_intent?: string | { id: string } | null };
    const paymentIntentId =
      typeof object.payment_intent === "string"
        ? object.payment_intent
        : (object.payment_intent?.id ?? (event.type.startsWith("payment_intent.") ? object.id : null));

    return {
      id: event.id,
      type: event.type,
      objectId: object.id,
      paymentIntentId,
    };
  }
}
