"use client";

import { useState, useTransition } from "react";
import { setLeaderboardVisibility } from "@/lib/gamification/actions";
import { Button } from "@/components/ui";

export function LeaderboardVisibilityToggle({ initialOptIn }: { initialOptIn: boolean }) {
  const [optIn, setOptIn] = useState(initialOptIn);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !optIn;
    setOptIn(next); // optimistic — the server action still enforces the real check
    startTransition(async () => {
      await setLeaderboardVisibility(next);
    });
  }

  return (
    <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
      <span className="text-neutral-600">
        {optIn ? "Visible on the public leaderboard" : "Hidden from the public leaderboard"}
      </span>
      <Button variant="secondary" onClick={toggle} disabled={isPending}>
        {optIn ? "Hide me" : "Show me"}
      </Button>
    </div>
  );
}
