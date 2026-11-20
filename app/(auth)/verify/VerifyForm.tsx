"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";

export function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError ? "That link is invalid or has expired. Enter your code instead." : null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    if (response.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const data: { error?: string } | null = await response.json().catch(() => null);
    setStatus("error");
    setErrorMessage(
      data?.error === "rate_limited"
        ? "Too many attempts. Please try again later."
        : "That code is invalid or has expired.",
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="6-digit code"
          required
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Verifying…" : "Verify"}
        </Button>
        <p className="text-sm text-neutral-500">
          You can also use the one-click link we emailed you instead of typing a code.
        </p>
      </form>
    </Card>
  );
}
