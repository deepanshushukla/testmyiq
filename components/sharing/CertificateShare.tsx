"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { buildUnlockedShareText } from "@/lib/sharing/copy";
import type { CertificateVisibilitySettings } from "@/lib/sharing/types";
import { ShareSheet } from "./ShareSheet";

const DEFAULT_SETTINGS: CertificateVisibilitySettings = {
  showScore: true,
  showCategoryBreakdown: false,
  showBadges: true,
  indexable: false,
};

const TOGGLES: { key: keyof CertificateVisibilitySettings; label: string }[] = [
  { key: "showScore", label: "Show my score" },
  { key: "showCategoryBreakdown", label: "Show my category breakdown" },
  { key: "showBadges", label: "Show my badges" },
  { key: "indexable", label: "Let search engines index my share page" },
];

/**
 * The backend enforces these settings server-side on every read
 * (lib/sharing/public-card.ts) — this form only ever expresses what the
 * user *wants*, never what gets shown; a compromised/buggy client can't
 * widen visibility beyond what the server stores.
 */
export function CertificateShare({ assessmentId }: { assessmentId: string }) {
  const [settings, setSettings] = useState<CertificateVisibilitySettings>(DEFAULT_SETTINGS);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggle(key: keyof CertificateVisibilitySettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleGenerate() {
    setSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/share/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, visibilitySettings: settings }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.message ?? "Couldn't create your share link. Please try again.");
        return;
      }
      setPublicSlug(body.publicSlug);
    } catch {
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-neutral-900">Share your results</h2>
      <p className="text-sm text-neutral-600">
        Choose what your public share card shows, then generate a link.
      </p>
      <fieldset className="flex flex-col gap-2 text-sm text-neutral-700">
        {TOGGLES.map((toggleOption) => (
          <label key={toggleOption.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings[toggleOption.key]}
              onChange={() => toggle(toggleOption.key)}
            />
            {toggleOption.label}
          </label>
        ))}
      </fieldset>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <Button onClick={handleGenerate} disabled={saving}>
        {saving ? "Saving…" : publicSlug ? "Update share link" : "Create share link"}
      </Button>
      {publicSlug && <ShareSheet path={`/u/${publicSlug}`} text={buildUnlockedShareText()} />}
    </Card>
  );
}
