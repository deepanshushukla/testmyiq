"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { BASE_URL } from "@/lib/seo/constants";

type Platform = {
  name: string;
  buildHref: (url: string, text: string) => string;
};

// Plain share-URL templates — no SDKs, no app registration needed for any
// of these (requirement.txt Part 8: LinkedIn/X/WhatsApp/Facebook/Telegram).
const PLATFORMS: Platform[] = [
  {
    name: "LinkedIn",
    buildHref: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "X",
    buildHref: (url, text) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "WhatsApp",
    buildHref: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    name: "Facebook",
    buildHref: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "Telegram",
    buildHref: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

/**
 * Generic share surface: `path` is resolved against the fixed BASE_URL
 * constant (not `window.location`), so the same absolute URL renders on
 * server and client with no hydration mismatch — the platform `<a href>`s
 * need a real absolute URL up front, not just at click time.
 */
export function ShareSheet({ path, text }: { path: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const url = new URL(path, BASE_URL).toString();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the platform links below still work.
    }
  }

  async function handleNativeShare() {
    // Feature-detected at click time, not at mount — avoids a hydration
    // mismatch from conditionally rendering this button based on a
    // client-only API (navigator.share doesn't exist during SSR).
    if (typeof navigator.share !== "function") {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({ title: text, text, url });
    } catch {
      // User cancelled, or the API rejected — nothing to recover from.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PLATFORMS.map((platform) => (
        <a
          key={platform.name}
          href={platform.buildHref(url, text)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {platform.name}
        </a>
      ))}
      <Button variant="secondary" onClick={handleNativeShare}>
        Share…
      </Button>
      <Button variant="secondary" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
