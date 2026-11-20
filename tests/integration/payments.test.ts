import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { createUnlockPaymentIntent } from "@/lib/payments/create-intent";
import { handleStripeWebhook } from "@/lib/payments/webhook";
import { listPaymentsForAdmin, getPaymentRevenueSummary } from "@/lib/payments/admin";
import { PaymentError } from "@/lib/payments/errors";
import { StripePaymentProvider } from "@/lib/payments/stripe-provider";
import { createVerifiedUser, seedAssessmentFixtures, startAndSubmitAssessment } from "./helpers/assessment-fixtures";
import { FakePaymentProvider, signStripeEvent } from "./helpers/payment-fixtures";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;
const fakeProvider = new FakePaymentProvider();
// Real signature verification (pure local HMAC) but no real secret key —
// mirrors exactly how getPaymentProvider() builds this in dev without a
// Stripe account (lib/payments/index.ts).
const realVerifyingProvider = new StripePaymentProvider("", WEBHOOK_SECRET);

async function getResult(assessmentId: string) {
  return prisma.assessmentResult.findUniqueOrThrow({ where: { assessmentId } });
}

describe("payments", () => {
  beforeEach(async () => {
    await seedAssessmentFixtures();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("createUnlockPaymentIntent", () => {
    it("rejects an assessment that doesn't belong to the caller", async () => {
      const owner = await createVerifiedUser("owner@example.com");
      const stranger = await createVerifiedUser("stranger@example.com");
      const assessment = await startAndSubmitAssessment(owner.id, "all-incorrect");

      await expect(
        createUnlockPaymentIntent(stranger.id, assessment.id, randomUUID(), fakeProvider),
      ).rejects.toMatchObject({ code: "forbidden" });
    });

    it("rejects an assessment that hasn't been submitted yet", async () => {
      const user = await createVerifiedUser("not-submitted@example.com");
      const assessment = await startOrResumeAssessment(user.id);

      await expect(
        createUnlockPaymentIntent(user.id, assessment.id, randomUUID(), fakeProvider),
      ).rejects.toMatchObject({ code: "not_submitted" });
    });

    it("rejects a result that's already unlocked", async () => {
      const user = await createVerifiedUser("already-unlocked@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await prisma.assessmentResult.update({
        where: { assessmentId: assessment.id },
        data: { resultAccessState: "UNLOCKED_BY_REFERRAL" },
      });

      await expect(
        createUnlockPaymentIntent(user.id, assessment.id, randomUUID(), fakeProvider),
      ).rejects.toMatchObject({ code: "already_unlocked" });
    });

    it("creates a $1 PENDING payment and moves the result to PAYMENT_PENDING", async () => {
      const user = await createVerifiedUser("checkout@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      expect((await getResult(assessment.id)).resultAccessState).toBe("LOCKED");

      const { clientSecret, paymentId } = await createUnlockPaymentIntent(
        user.id,
        assessment.id,
        randomUUID(),
        fakeProvider,
      );

      expect(clientSecret).toMatch(/_secret_test$/);
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      expect(payment.status).toBe("PENDING");
      expect(payment.amountCents).toBe(100);
      expect(payment.currency).toBe("usd");

      expect((await getResult(assessment.id)).resultAccessState).toBe("PAYMENT_PENDING");
    });

    it("is idempotent on a resubmitted client idempotency key — never creates a second payment", async () => {
      const user = await createVerifiedUser("retry-checkout@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      const key = randomUUID();

      const first = await createUnlockPaymentIntent(user.id, assessment.id, key, fakeProvider);
      const second = await createUnlockPaymentIntent(user.id, assessment.id, key, fakeProvider);

      expect(second.paymentId).toBe(first.paymentId);
      expect(second.clientSecret).toBe(first.clientSecret);
      const count = await prisma.payment.count({ where: { idempotencyKey: key } });
      expect(count).toBe(1);
    });

    it("rejects reusing the same idempotency key for a different assessment", async () => {
      const user = await createVerifiedUser("key-reuse@example.com");
      const assessmentA = await startAndSubmitAssessment(user.id, "all-incorrect");
      const otherUser = await createVerifiedUser("key-reuse-2@example.com");
      const assessmentB = await startAndSubmitAssessment(otherUser.id, "all-incorrect");
      const key = randomUUID();

      await createUnlockPaymentIntent(user.id, assessmentA.id, key, fakeProvider);

      await expect(
        createUnlockPaymentIntent(otherUser.id, assessmentB.id, key, fakeProvider),
      ).rejects.toMatchObject({ code: "idempotency_key_conflict" });
    });

    it("a frontend 'payment succeeded' redirect never unlocks anything on its own", async () => {
      const user = await createVerifiedUser("no-fake-success@example.com");
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      await createUnlockPaymentIntent(user.id, assessment.id, randomUUID(), fakeProvider);

      // No webhook delivered — simulates the browser reaching a "success"
      // return_url on its own. The result must still be locked.
      const result = await getResult(assessment.id);
      expect(result.resultAccessState).toBe("PAYMENT_PENDING");
      expect(result.resultAccessState).not.toBe("UNLOCKED_BY_PAYMENT");
    });
  });

  describe("StripePaymentProvider.createPaymentIntent without a real secret key", () => {
    it("fails clearly with provider_not_configured instead of calling Stripe's API", async () => {
      const unconfigured = new StripePaymentProvider("", WEBHOOK_SECRET);
      await expect(
        unconfigured.createPaymentIntent({
          amountCents: 100,
          currency: "usd",
          idempotencyKey: randomUUID(),
          metadata: {},
        }),
      ).rejects.toThrow(PaymentError);
      await expect(
        unconfigured.createPaymentIntent({
          amountCents: 100,
          currency: "usd",
          idempotencyKey: randomUUID(),
          metadata: {},
        }),
      ).rejects.toMatchObject({ code: "provider_not_configured" });
    });
  });

  describe("webhook signature verification (pure local HMAC, no network call)", () => {
    it("accepts a correctly signed payload", async () => {
      const { rawBody, signature } = signStripeEvent(WEBHOOK_SECRET, "payment_intent.succeeded", {
        id: "pi_nonexistent_for_sig_test",
      });

      // Doesn't throw — the payment just isn't ours, so it's a no-op.
      await expect(
        handleStripeWebhook(rawBody, signature, realVerifyingProvider),
      ).resolves.toBeUndefined();
    });

    it("rejects a tampered payload", async () => {
      const { rawBody, signature } = signStripeEvent(WEBHOOK_SECRET, "payment_intent.succeeded", {
        id: "pi_original",
      });
      const tampered = rawBody.replace("pi_original", "pi_swapped_in_by_attacker");

      await expect(
        handleStripeWebhook(tampered, signature, realVerifyingProvider),
      ).rejects.toThrow();
    });

    it("rejects a payload signed with the wrong secret", async () => {
      const { rawBody, signature } = signStripeEvent("whsec_a_different_secret", "payment_intent.succeeded", {
        id: "pi_wrong_secret",
      });

      await expect(
        handleStripeWebhook(rawBody, signature, realVerifyingProvider),
      ).rejects.toThrow();
    });
  });

  describe("webhook processing", () => {
    async function initiateCheckout(email: string) {
      const user = await createVerifiedUser(email);
      const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");
      const { paymentId } = await createUnlockPaymentIntent(
        user.id,
        assessment.id,
        randomUUID(),
        fakeProvider,
      );
      const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
      return { user, assessment, payment };
    }

    it("payment_intent.succeeded marks the payment SUCCEEDED and unlocks the result exactly once", async () => {
      const { assessment, payment } = await initiateCheckout("webhook-success@example.com");
      const { rawBody, signature } = signStripeEvent(
        WEBHOOK_SECRET,
        "payment_intent.succeeded",
        { id: payment.providerPaymentId! },
      );

      await handleStripeWebhook(rawBody, signature, realVerifyingProvider);

      const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe("SUCCEEDED");
      expect(updatedPayment.webhookEventId).not.toBeNull();

      const result = await getResult(assessment.id);
      expect(result.resultAccessState).toBe("UNLOCKED_BY_PAYMENT");

      const unlock = await prisma.resultUnlock.findUniqueOrThrow({
        where: { assessmentResultId: result.id },
      });
      expect(unlock.unlockMethod).toBe("PAYMENT");
    });

    it("is idempotent under a duplicated webhook delivery", async () => {
      const { assessment, payment } = await initiateCheckout("webhook-duplicate@example.com");
      const { rawBody, signature } = signStripeEvent(
        WEBHOOK_SECRET,
        "payment_intent.succeeded",
        { id: payment.providerPaymentId! },
      );

      await handleStripeWebhook(rawBody, signature, realVerifyingProvider);
      await handleStripeWebhook(rawBody, signature, realVerifyingProvider);
      await handleStripeWebhook(rawBody, signature, realVerifyingProvider);

      const result = await getResult(assessment.id);
      expect(result.resultAccessState).toBe("UNLOCKED_BY_PAYMENT");
      const unlockCount = await prisma.resultUnlock.count({
        where: { assessmentResultId: result.id },
      });
      expect(unlockCount).toBe(1);
    });

    it("is idempotent under concurrently racing duplicate deliveries", async () => {
      const { assessment, payment } = await initiateCheckout("webhook-race@example.com");
      const { rawBody, signature } = signStripeEvent(
        WEBHOOK_SECRET,
        "payment_intent.succeeded",
        { id: payment.providerPaymentId! },
      );

      await Promise.all([
        handleStripeWebhook(rawBody, signature, realVerifyingProvider),
        handleStripeWebhook(rawBody, signature, realVerifyingProvider),
        handleStripeWebhook(rawBody, signature, realVerifyingProvider),
      ]);

      const result = await getResult(assessment.id);
      expect(result.resultAccessState).toBe("UNLOCKED_BY_PAYMENT");
      const unlockCount = await prisma.resultUnlock.count({
        where: { assessmentResultId: result.id },
      });
      expect(unlockCount).toBe(1);
    });

    it("payment_intent.payment_failed marks the payment FAILED and leaves the result LOCKED again", async () => {
      const { assessment, payment } = await initiateCheckout("webhook-failed@example.com");
      expect((await getResult(assessment.id)).resultAccessState).toBe("PAYMENT_PENDING");

      const { rawBody, signature } = signStripeEvent(
        WEBHOOK_SECRET,
        "payment_intent.payment_failed",
        { id: payment.providerPaymentId! },
      );
      await handleStripeWebhook(rawBody, signature, realVerifyingProvider);

      const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe("FAILED");

      const result = await getResult(assessment.id);
      expect(result.resultAccessState).toBe("LOCKED");
    });

    it("charge.refunded marks the payment REFUNDED but does not re-lock an already-unlocked result", async () => {
      const { assessment, payment } = await initiateCheckout("webhook-refund@example.com");
      const succeeded = signStripeEvent(WEBHOOK_SECRET, "payment_intent.succeeded", {
        id: payment.providerPaymentId!,
      });
      await handleStripeWebhook(succeeded.rawBody, succeeded.signature, realVerifyingProvider);
      expect((await getResult(assessment.id)).resultAccessState).toBe("UNLOCKED_BY_PAYMENT");

      const refund = signStripeEvent(WEBHOOK_SECRET, "charge.refunded", {
        id: `ch_${randomUUID()}`,
        payment_intent: payment.providerPaymentId!,
      });
      await handleStripeWebhook(refund.rawBody, refund.signature, realVerifyingProvider);

      const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
      expect(updatedPayment.status).toBe("REFUNDED");

      const result = await getResult(assessment.id);
      expect(result.resultAccessState).toBe("UNLOCKED_BY_PAYMENT");
    });

    it("ignores webhook events for a payment intent we have no record of", async () => {
      const { rawBody, signature } = signStripeEvent(
        WEBHOOK_SECRET,
        "payment_intent.succeeded",
        { id: "pi_unknown_to_us" },
      );
      await expect(
        handleStripeWebhook(rawBody, signature, realVerifyingProvider),
      ).resolves.toBeUndefined();
    });

    it("no-ops on an unregistered event type", async () => {
      const { rawBody, signature } = signStripeEvent(WEBHOOK_SECRET, "charge.dispute.created", {
        id: "dp_whatever",
      });
      await expect(
        handleStripeWebhook(rawBody, signature, realVerifyingProvider),
      ).resolves.toBeUndefined();
    });
  });

  describe("admin payments view", () => {
    it("surfaces transactions and an accurate revenue summary", async () => {
      const succeededUser = await createVerifiedUser("admin-view-succeeded@example.com");
      const succeededAssessment = await startAndSubmitAssessment(succeededUser.id, "all-incorrect");
      const { paymentId: succeededPaymentId } = await createUnlockPaymentIntent(
        succeededUser.id,
        succeededAssessment.id,
        randomUUID(),
        fakeProvider,
      );
      const succeededPayment = await prisma.payment.findUniqueOrThrow({
        where: { id: succeededPaymentId },
      });
      const succeededEvent = signStripeEvent(WEBHOOK_SECRET, "payment_intent.succeeded", {
        id: succeededPayment.providerPaymentId!,
      });
      await handleStripeWebhook(succeededEvent.rawBody, succeededEvent.signature, realVerifyingProvider);

      const failedUser = await createVerifiedUser("admin-view-failed@example.com");
      const failedAssessment = await startAndSubmitAssessment(failedUser.id, "all-incorrect");
      const { paymentId: failedPaymentId } = await createUnlockPaymentIntent(
        failedUser.id,
        failedAssessment.id,
        randomUUID(),
        fakeProvider,
      );
      const failedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: failedPaymentId } });
      const failedEvent = signStripeEvent(WEBHOOK_SECRET, "payment_intent.payment_failed", {
        id: failedPayment.providerPaymentId!,
      });
      await handleStripeWebhook(failedEvent.rawBody, failedEvent.signature, realVerifyingProvider);

      const payments = await listPaymentsForAdmin();
      const emails = payments.map((payment) => payment.user.email);
      expect(emails).toContain("admin-view-succeeded@example.com");
      expect(emails).toContain("admin-view-failed@example.com");

      const revenue = await getPaymentRevenueSummary();
      expect(revenue.succeededCount).toBeGreaterThanOrEqual(1);
      expect(revenue.succeededAmountCents).toBeGreaterThanOrEqual(100);
      expect(revenue.failedCount).toBeGreaterThanOrEqual(1);
    });
  });
});
