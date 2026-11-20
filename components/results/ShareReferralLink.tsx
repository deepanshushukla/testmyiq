"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ShareReferralLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  // A relative path renders identically on server and client (no
  // hydration mismatch); the full origin is only ever read at click time,
  // when writing to the clipboard — never stored in render state.
  const relativeLink = `/r/${code}`;

  async function handleCopy() {
    const fullLink = `${window.location.origin}${relativeLink}`;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the input is
      // still selectable, so the user can copy it manually.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={relativeLink}
        onFocus={(event) => event.target.select()}
        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        aria-label="Your referral link"
      />
      <Button variant="secondary" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
