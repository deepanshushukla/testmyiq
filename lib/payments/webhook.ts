import { Prisma, type ResultAccessState } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getEmailProvider, type EmailProvider } from "@/lib/email";
import { buildPaymentConfirmationEmail } from "@/lib/email/templates";
import { getPaymentProvider } from "./index";
import type { PaymentProvider } from "./provider";

const UNLOCK_ELIGIBLE_STATES: ResultAccessState[] = ["LOCKED", "REFERRAL_PENDING", "PAYMENT_PENDING"];

/**
 * Entry point for POST /api/payments/webhook/stripe. `rawBody` must be the
 * exact, unparsed request body — Stripe's signature covers the raw bytes,
 * so re-serializing a parsed JSON object would break verification.
 *
 * Idempotency has two layers, same split as lib/referrals/unlock.ts:
 * a cheap `payment.status` check up front (handles the common case — a
 * webhook redelivered after we already processed it) and the
 * `ResultUnlock.assessmentResultId` unique constraint as the actual
 * concurrency-safe backstop (handles two deliveries racing in at once).
 */
export async function handleStripeWebhook(
  rawBody: string,
  signatureHeader: string,
  provider: PaymentProvider = getPaymentProvider(),
  emailProvider: EmailProvider = getEmailProvider(),
): Promise<void> {
  // Throws on an invalid/tampered signature — the caller (the API route)
  // lets that propagate into a 400, never a 200, so Stripe retries.
  const event = provider.constructWebhookEvent(rawBody, signatureHeader);

  switch (event.type) {
    case "payment_intent.succeeded":
      await handleSucceeded(event.objectId, event.id, emailProvider);
      break;
    case "payment_intent.payment_failed":
      await handleFailed(event.objectId, event.id);
      break;
    case "charge.refunded":
      if (event.paymentIntentId) {
        await handleRefunded(event.paymentIntentId, event.id);
      }
      break;
    default:
      // Every other event type Stripe might send is a deliberate no-op,
      // not an error — we only registered for the three above.
      break;
  }
}

async function handleSucceeded(
  providerPaymentId: string,
  eventId: string,
  emailProvider: EmailProvider,
): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId } });
  if (!payment || payment.status === "SUCCEEDED") return;

  // `webhookEventId` is unique — recorded alongside the status flip as an
  // audit trail of which Stripe event caused it (docs/API.md §4 "audit
  // payment events"). The `payment.status` check above is still the
  // idempotency gate for a redelivered event; this never doubles as that.
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "SUCCEEDED", webhookEventId: eventId },
  });
  await unlockViaPayment(payment.assessmentId, payment.userId, emailProvider);
}

async function handleFailed(providerPaymentId: string, eventId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId } });
  if (!payment || payment.status === "SUCCEEDED" || payment.status === "FAILED") return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", webhookEventId: eventId },
    });

    const result = await tx.assessmentResult.findUnique({
      where: { assessmentId: payment.assessmentId },
    });
    // Only drop PAYMENT_PENDING back to LOCKED — never touch a result
    // that's already unlocked some other way (e.g. a referral qualified
    // in the meantime).
    if (result && result.resultAccessState === "PAYMENT_PENDING") {
      await tx.assessmentResult.update({ where: { id: result.id }, data: { resultAccessState: "LOCKED" } });
    }
  });
}

async function handleRefunded(providerPaymentId: string, eventId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { providerPaymentId } });
  if (!payment || payment.status === "REFUNDED") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED", webhookEventId: eventId },
  });
  // Deliberately does not re-lock an already-unlocked result — mirrors the
  // docs/REFERRAL_RULES.md precedent that an existing unlock is never
  // revoked. A refund is visible to admins (docs/API.md §4) but is an
  // audit/support signal, not an access-control event. Documented
  // assumption — flagged for the user to confirm once real payments flow.
}

async function unlockViaPayment(
  assessmentId: string,
  userId: string,
  emailProvider: EmailProvider,
): Promise<void> {
  const result = await prisma.assessmentResult.findUnique({ where: { assessmentId } });
  if (!result || !UNLOCK_ELIGIBLE_STATES.includes(result.resultAccessState)) {
    return;
  }

  try {
    await prisma.$transaction([
      prisma.assessmentResult.update({
        where: { id: result.id },
        data: { resultAccessState: "UNLOCKED_BY_PAYMENT" },
      }),
      prisma.resultUnlock.create({
        data: { assessmentResultId: result.id, unlockMethod: "PAYMENT" },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return; // already unlocked by a concurrent/duplicate delivery — and
      // therefore already confirmed by email the first time, too.
    }
    throw error;
  }

  // requirement.txt §2.2 step 8: "User receives a confirmation email."
  // Sent only on the transaction above actually succeeding — never on the
  // P2002 no-op path, so a duplicated webhook delivery doesn't double-send.
  // Best-effort and deliberately swallowed on failure: the unlock already
  // committed and must never be undone over a notification failing, and
  // letting this throw would make the API route return non-2xx to Stripe
  // — Stripe would retry the whole webhook, but the retry's `payment.status
  // === "SUCCEEDED"` check above would short-circuit before ever reaching
  // this send again, so a throw here would only cost Stripe retries for no
  // benefit, never actually get the email sent.
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
      const appName = process.env.APP_NAME ?? "Cognitive Assessment Platform";
      await emailProvider.send({
        to: user.email,
        ...buildPaymentConfirmationEmail({
          resultsUrl: `${baseUrl}/results/${assessmentId}`,
          appName,
        }),
      });
    }
  } catch (error) {
    console.error("Failed to send payment confirmation email", error);
  }
}
