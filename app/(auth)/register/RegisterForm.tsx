"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";
import { OAuthButtons } from "../OAuthButtons";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? undefined;

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        displayName: displayName || undefined,
        referralCode,
      }),
    });

    if (response.ok) {
      setStatus("sent");
      return;
    }

    const data: { error?: string } | null = await response.json().catch(() => null);
    setStatus("error");
    setErrorMessage(
      data?.error === "already_registered"
        ? "An account with this email already exists. Try logging in instead."
        : data?.error === "rate_limited"
          ? "Too many attempts. Please try again later."
          : "Something went wrong. Please try again.",
    );
  }

  if (status === "sent") {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-neutral-900">Check your email</h2>
        <p className="text-neutral-600">
          We sent a 6-digit code and a one-click link to <strong>{email}</strong>. Enter
          the code on the next page, or click the link.
        </p>
        <Link href={`/verify?email=${encodeURIComponent(email)}`}>
          <Button variant="secondary">Enter code</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <OAuthButtons referralCode={referralCode} />
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
        <Input
          label="Display name (optional)"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        {referralCode ? (
          <p className="text-sm text-neutral-500">Referred by code: {referralCode}</p>
        ) : null}
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Create account"}
        </Button>
        <p className="text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-600 underline">
            Log in
          </Link>
        </p>
      </form>
    </Card>
  );
}
