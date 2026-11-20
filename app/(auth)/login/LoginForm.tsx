"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { OAuthButtons } from "../OAuthButtons";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Something went wrong signing you in. Please try again.",
  oauth_not_configured: "That sign-in option isn't available yet — try email instead.",
  rate_limited: "Too many attempts. Please try again later.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Always shown, regardless of whether the account exists.
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-neutral-900">Check your email</h2>
        <p className="text-neutral-600">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a 6-digit
          code and a one-click link.
        </p>
        <Link href={`/verify?email=${encodeURIComponent(email)}`}>
          <Button variant="secondary">Enter code</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      {oauthError ? (
        <p className="text-sm text-red-600">
          {OAUTH_ERROR_MESSAGES[oauthError] ?? "Something went wrong. Please try again."}
        </p>
      ) : null}
      <OAuthButtons />
      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        or
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send login link"}
        </Button>
        <p className="text-sm text-neutral-500">
          New here?{" "}
          <Link href="/register" className="text-brand-600 underline">
            Create an account
          </Link>
        </p>
      </form>
    </Card>
  );
}
