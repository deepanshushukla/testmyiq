"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DisqualifyButton({ qualificationId }: { qualificationId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) return;
    setSubmitting(true);
    await fetch(`/api/admin/referrals/${qualificationId}/disqualify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setSubmitting(false);
    setShowForm(false);
    router.refresh();
  }

  if (!showForm) {
    return (
      <Button variant="ghost" onClick={() => setShowForm(true)}>
        Disqualify
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason (audited)"
        className="rounded-lg border border-neutral-300 px-2 py-1 text-xs"
      />
      <Button variant="ghost" onClick={handleSubmit} disabled={submitting || !reason.trim()}>
        {submitting ? "Saving…" : "Confirm"}
      </Button>
    </div>
  );
}
