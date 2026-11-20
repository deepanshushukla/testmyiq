"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function StartAssessmentButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const response = await fetch("/api/assessment/start", { method: "POST" });
    const data: { attemptId?: string } | null = await response.json().catch(() => null);
    if (data?.attemptId) {
      router.push(`/assessment/${data.attemptId}`);
    }
    setLoading(false);
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? "Starting…" : "Start assessment"}
    </Button>
  );
}
