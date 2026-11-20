"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Purely a pacing cue — drains over this question's own expected-solving-
 * time, then fires `onExpire` once (the quiz runner advances to the next
 * question on expiry, but nothing here enforces anything on its own; the
 * one deadline that's ever actually enforced is the assessment-level
 * `expiresAt`, handled separately and invisibly in QuizRunner). Mount a
 * fresh instance per question (parent passes `key={assessmentQuestionId}`)
 * rather than resetting via an effect — simpler, and avoids a stale timer
 * racing a prop update.
 *
 * Driven by requestAnimationFrame rather than a fixed setInterval + CSS
 * transition: ticking on a ~250ms interval while a CSS `transition`
 * animates toward each new width independently produced a visible
 * stutter (move, pause, jump) — rAF updates the width every frame
 * instead, so there's nothing for a CSS transition to catch up to.
 */
export function QuestionTimerBar({
  expectedSeconds,
  onExpire,
}: {
  expectedSeconds: number;
  onExpire?: () => void;
}) {
  const totalMs = Math.max(1, expectedSeconds) * 1000;
  const [pct, setPct] = useState(100);
  const hasExpiredRef = useRef(false);

  useEffect(() => {
    const startedAt = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const remaining = Math.max(0, totalMs - (now - startedAt));
      setPct((remaining / totalMs) * 100);

      if (remaining <= 0) {
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpire?.();
        }
        return;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [totalMs, onExpire]);

  const isLow = pct < 20;

  return (
    <div
      role="progressbar"
      aria-label="Time for this question"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
    >
      <div
        className={`h-full rounded-full ${isLow ? "bg-red-500" : "bg-brand-600"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
