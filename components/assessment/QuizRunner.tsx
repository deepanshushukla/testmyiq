"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssessmentStatus } from "@prisma/client";
import { Button, Card } from "@/components/ui";
import { QuizGamificationStrip } from "@/components/gamification/QuizGamificationStrip";
import { QuestionTimerBar } from "./QuestionTimerBar";

type QuizQuestion = {
  assessmentQuestionId: string;
  displayOrder: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categoryId: string;
  questionText: string;
  imageUrl: string | null;
  kind: "STANDARD" | "STIMULUS" | "RECALL";
  expectedSolvingTimeSeconds: number;
  options: { id: string; label: string; optionText: string }[];
  selectedOptionId: string | null;
  markedForReview: boolean;
};

type QuizRunnerProps = {
  attemptId: string;
  expiresAt: string;
  initialStatus: AssessmentStatus;
  initialQuestions: QuizQuestion[];
  initialXpTotal: number;
};

/** Retries network failures (not 4xx responses) with backoff — Part 4's
 * "handle temporary network failures without losing submitted answers." */
async function postWithRetry(url: string, body: unknown, attempts = 3): Promise<Response | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok || response.status < 500) {
        return response;
      }
    } catch {
      // Network failure — fall through to retry.
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  return null;
}

export function QuizRunner({
  attemptId,
  expiresAt,
  initialStatus,
  initialQuestions,
  initialXpTotal,
}: QuizRunnerProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState<AssessmentStatus>(initialStatus);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "error">("idle");
  const submittingRef = useRef(false);

  const current = questions[currentIndex];

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const response = await postWithRetry(`/api/assessment/${attemptId}/submit`, {});
    const data: { status?: AssessmentStatus } | null = response
      ? await response.json().catch(() => null)
      : null;
    setStatus(data?.status ?? "SUBMITTED");
    submittingRef.current = false;
  }, [attemptId]);

  const saveAnswer = useCallback(
    async (patch: { selectedOptionId?: string; markedForReview?: boolean }) => {
      setSavingState("saving");
      const response = await postWithRetry(`/api/assessment/${attemptId}/answer`, {
        assessmentQuestionId: current.assessmentQuestionId,
        ...patch,
      });

      if (response?.status === 409) {
        await submit();
        return;
      }
      setSavingState(response?.ok ? "idle" : "error");
    },
    [attemptId, current.assessmentQuestionId, submit],
  );

  function selectOption(optionId: string) {
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === currentIndex ? { ...question, selectedOptionId: optionId } : question,
      ),
    );
    void saveAnswer({ selectedOptionId: optionId });
  }

  function toggleMarkedForReview() {
    const next = !current.markedForReview;
    setQuestions((prev) =>
      prev.map((question, index) =>
        index === currentIndex ? { ...question, markedForReview: next } : question,
      ),
    );
    void saveAnswer({ markedForReview: next });
  }

  // Forward-only, by design: there's no Previous anywhere (button or
  // keyboard), and this is also what the per-question timer calls on
  // expiry. On the last question this is a no-op (nothing to advance to)
  // — the user has to answer and submit from there.
  const goNext = useCallback(() => {
    setCurrentIndex((index) => Math.min(questions.length - 1, index + 1));
  }, [questions.length]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [goNext]);

  // The real deadline is never shown — only enforced. This watches
  // `expiresAt` silently (no state tied to the tick, so no re-render ever
  // happens from it) and submits once, the moment it passes; if the user
  // never triggers this (tab closed, etc.), the server's own lazy
  // auto-finalize on their next request still catches it regardless
  // (docs/ARCHITECTURE.md §4.4) — this is purely a responsiveness nicety,
  // not the actual guarantee.
  useEffect(() => {
    const deadline = new Date(expiresAt).getTime();
    let hasFired = false;
    const interval = setInterval(() => {
      if (!hasFired && Date.now() >= deadline) {
        hasFired = true;
        void submit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, submit]);

  // Consecutive answered questions walking back from the current one —
  // purely cosmetic (components/gamification/QuizGamificationStrip.tsx),
  // never stored or scored. STIMULUS screens have nothing to answer, so
  // they're transparent to the count rather than breaking it. The current
  // question being unanswered (the normal case right after navigating
  // forward) doesn't itself break the streak — only an unanswered
  // *previous* question does, so "2 in a row" still shows while you're
  // sitting on question 3, not just after you've answered it too.
  const streak = useMemo(() => {
    let count = 0;
    let index = currentIndex;
    if (questions[index]?.kind !== "STIMULUS" && questions[index]?.selectedOptionId) {
      count = 1;
    }
    for (index -= 1; index >= 0; index -= 1) {
      const question = questions[index];
      if (question.kind === "STIMULUS") continue;
      if (!question.selectedOptionId) break;
      count += 1;
    }
    return count;
  }, [questions, currentIndex]);

  // STIMULUS screens have nothing to answer, so they're excluded from
  // both counts — otherwise "unanswered" could never reach zero.
  const scorableQuestions = useMemo(
    () => questions.filter((question) => question.kind !== "STIMULUS"),
    [questions],
  );
  const answeredCount = scorableQuestions.filter((question) => question.selectedOptionId).length;
  const unansweredCount = scorableQuestions.length - answeredCount;

  if (status !== "IN_PROGRESS") {
    return (
      <Card className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-neutral-900">
          {status === "EXPIRED" ? "Time's up — your assessment was submitted" : "Assessment submitted"}
        </h1>
        <p className="text-neutral-600">
          Your answers have been recorded and scored.
        </p>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => router.push(`/results/${attemptId}`)}>
            View my results
          </Button>
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <QuestionTimerBar
          key={current.assessmentQuestionId}
          expectedSeconds={current.expectedSolvingTimeSeconds}
          onExpire={goNext}
        />
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-500">
            Answered: {answeredCount} · Unanswered: {unansweredCount}
          </span>
          <QuizGamificationStrip xpTotal={initialXpTotal} streak={streak} />
        </div>
      </div>

      {current.kind === "STIMULUS" ? (
        <Card className="flex flex-col gap-4 border-amber-200 bg-amber-50">
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">
            Memorize this — you&apos;ll be asked about it later
          </p>
          <p className="text-lg text-neutral-900">{current.questionText}</p>
          <div>
            <Button variant="primary" onClick={goNext} disabled={currentIndex === questions.length - 1}>
              Continue
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-4">
            <p className="text-lg text-neutral-900">{current.questionText}</p>
            {current.imageUrl ? (
              // Plain <img>, not next/image: question images are admin-provided
              // URLs with no configured remote pattern yet, and no seeded
              // question currently uses one — revisit once an image pipeline
              // exists (Part 9).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.imageUrl} alt="" className="max-w-full rounded-lg" />
            ) : null}
            <div className="flex flex-col gap-2">
              {current.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                    current.selectedOptionId === option.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-neutral-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={current.assessmentQuestionId}
                    checked={current.selectedOptionId === option.id}
                    onChange={() => selectOption(option.id)}
                  />
                  <span className="font-medium text-neutral-500">{option.label}.</span>
                  <span className="text-neutral-900">{option.optionText}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={current.markedForReview}
                onChange={toggleMarkedForReview}
              />
              Mark for review
            </label>
            {savingState === "error" ? (
              <p className="text-sm text-red-600">Couldn&apos;t save — retrying…</p>
            ) : null}
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button variant="secondary" onClick={goNext} disabled={currentIndex === questions.length - 1}>
              Next
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={currentIndex !== questions.length - 1}
            >
              Submit assessment
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
