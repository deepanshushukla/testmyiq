"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui";
import { getStripeClient } from "@/lib/payments/stripe-client";

type Phase = "idle" | "starting" | "checkout" | "confirming" | "polling" | "error";

/**
 * "polling" (after a successful confirmPayment call) is the bridge between
 * this component and lib/payments/webhook.ts: the frontend never marks a
 * result unlocked itself, it only waits for the result-access route to
 * reflect what the webhook already did. See docs/API.md §3 — a frontend
 * "success" redirect never unlocks anything on its own.
 */
export function UnlockWithPayment({ assessmentId }: { assessmentId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const router = useRouter();

  async function startCheckout() {
    setPhase("starting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/unlock/payment/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        if (body.error === "provider_not_configured") {
          setErrorMessage(
            "Card payments aren't available yet — use the free invite-friends unlock below instead.",
          );
        } else if (body.error === "already_unlocked") {
          router.refresh();
          return;
        } else {
          setErrorMessage(body.message ?? "Something went wrong. Please try again.");
        }
        setPhase("error");
        return;
      }

      setClientSecret(body.clientSecret);
      setPhase("checkout");
    } catch {
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
      setPhase("error");
    }
  }

  function pollForUnlock() {
    setPhase("polling");
    const interval = setInterval(async () => {
      const response = await fetch(`/api/results/${assessmentId}`);
      if (!response.ok) return;
      const body = await response.json();
      if (body.status === "unlocked") {
        clearInterval(interval);
        router.refresh();
      }
    }, 2000);

    // Stop polling after two minutes — a stuck webhook needs a human, not
    // an infinite client-side loop.
    setTimeout(() => clearInterval(interval), 120_000);
  }

  if (phase === "checkout" && clientSecret) {
    return (
      <Elements stripe={getStripeClient()} options={{ clientSecret }}>
        <CheckoutForm
          onConfirmed={pollForUnlock}
          onError={(message) => {
            setErrorMessage(message);
            setPhase("error");
          }}
        />
      </Elements>
    );
  }

  if (phase === "polling" || phase === "confirming") {
    return (
      <p className="text-sm text-neutral-600">
        Payment received — confirming and unlocking your results. This usually takes a few
        seconds.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <Button onClick={startCheckout} disabled={phase === "starting"}>
        {phase === "starting" ? "Loading…" : "Unlock My Results – $1"}
      </Button>
    </div>
  );
}

function CheckoutForm({
  onConfirmed,
  onError,
}: {
  onConfirmed: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    onConfirmed();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || submitting}>
        {submitting ? "Processing…" : "Pay $1"}
      </Button>
    </form>
  );
}
