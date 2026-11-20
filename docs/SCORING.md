# Scoring Engine

Status: **Implemented, Phase 6.** Implements Part 5 of requirement.txt.

## 1. Design principle

The scoring engine is a **pure, independently testable module**
(`lib/scoring/v1.ts`) with no DB/network access: it takes an assessment's
answers plus the question bank's answer key and weights as input, and
returns a structured result. `lib/results/create-result.ts`
(`ensureAssessmentResult`) is the DB-touching layer around it — it loads an
assessment's questions/answers, builds `ScoringInput`, calls `scoreV1`, and
persists an `AssessmentResult` row exactly once (idempotent, enforced by
both a pre-check and the DB's unique constraint on `assessmentId`). It's
called from `lib/assessment/submit.ts`'s `finalizeAssessment` — the single
point every path (explicit submit, lazy auto-finalize from state/answer/
start) funnels through when an assessment leaves `IN_PROGRESS` — so a
result always exists by the time anyone can view it.

```ts
// lib/scoring/types.ts
type ScoringInput = {
  scoringVersion: string;
  answers: Array<{
    questionId: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    categoryId: string;
    kind: "STANDARD" | "STIMULUS" | "RECALL"; // filter out STIMULUS before scoring
    scoringWeight: number;
    selectedOptionId: string | null;
    isCorrect: boolean | null; // null = unanswered
    expectedSolvingTimeSeconds: number;
  }>;
  completionTimeSeconds: number;
};

type ScoringOutput = {
  scoringVersion: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  rawScore: number;
  accuracyPercentage: number;
  difficultyBreakdown: Record<"EASY" | "MEDIUM" | "HARD", { correct: number; total: number }>;
  categoryBreakdown: Record<string, { correct: number; total: number }>;
  completionTimeSeconds: number;
  estimatedScore: number;
};
```

## 2. v1 methodology (scoringVersion = "v1")

- **STIMULUS questions are excluded entirely from every tally.** Phase 5
  added delayed-recall memory questions: a non-scored "memorize this"
  screen (`kind: STIMULUS`) shown earlier, paired with a scored RECALL
  question asked later. STIMULUS rows must never be counted in
  `correctCount`/`incorrectCount`/`unansweredCount`, the accuracy
  denominator, `totalQuestions`, or any breakdown — they're not test
  items, just a stimulus the paired RECALL question depends on. Scoring
  should filter `answers` to `kind !== "STIMULUS"` before computing
  anything. (RECALL questions themselves ARE scored normally, like any
  other question — only their paired STIMULUS is excluded.)
- **Raw score** = sum of `scoringWeight` for each correct answer.
  Unanswered and incorrect both contribute 0 — no penalty for wrong answers,
  since penalizing guesses without a documented psychometric basis is
  exactly what the spec warns against ("do not reward speed at the expense
  of accuracy without a documented reason" — symmetrically, don't penalize
  incorrect answers without one either).
- **Accuracy percentage** = `correctCount / (totalQuestions)` — unanswered
  count as incorrect for accuracy purposes (they were an opportunity to
  answer that wasn't taken), but are reported separately in the breakdown so
  the UI can distinguish "got it wrong" from "ran out of time for it."
- **Difficulty weights**: `scoring_weight` is set per-question in the
  question bank (Part 3), defaulting to `1.0` for Easy, `1.5` for Medium,
  `2.0` for Hard in the seed data — a documented, simple
  higher-difficulty-worth-more scheme. This is the "difficulty-specific
  weight… when justified" the spec asks for; the justification is recorded
  here, not left implicit in code.
- **No speed bonus in v1.** `completionTimeSeconds` is recorded and reported
  (transparency), but does **not** factor into `rawScore` or
  `estimatedScore`. The spec explicitly requires a documented reason before
  rewarding speed, and no such reason exists yet (e.g., a validated
  speed-accuracy tradeoff model). If introduced later, it ships as
  `scoringVersion = "v2"` with its own rationale recorded here, and v1
  results are never recomputed.
- **Estimated cognitive performance score**: `estimatedScore` is a simple
  linear rescaling of `rawScore` into a 0–200 presentational range (midpoint
  100), purely for a legible "score reveal" number. It is **not** a
  normed/standardized IQ score (no population sample, no standard
  deviation calibration exists yet) and the product copy must always use
  "Estimated Cognitive Performance Score," never "IQ," per
  `docs/PRD.md` §6. Percentile is **not** computed or displayed in v1 — the
  spec requires reliable normative data before showing one, and none exists
  yet. This is a product-blocking item, not a code task: showing a
  percentile requires a real user-performance distribution to norm against,
  which doesn't exist before launch.

## 3. Performance categories (presentational tier, not a clinical claim)

A simple banding of `estimatedScore` into labels (e.g., "Developing,"
"Solid," "Strong," "Exceptional") drives the results-page headline. Bands
are stored in `system_settings` (admin-configurable), not hardcoded, and are
clearly presentational — never implying clinical categorization.

## 4. Versioning

- Every `assessment_results` row stores `scoring_version`. The engine is
  dispatched by version (`lib/scoring/v1.ts`, future `v2.ts`, …); historical
  results are never recomputed when the methodology changes — this is a hard
  rule, enforced by the fact that re-scoring is simply not a code path that
  exists.
- Changing weights, bands, or the speed-bonus decision requires a new
  `scoringVersion` and a new `assessment_templates.version`, not an edit to
  v1's constants.

## 5. Testability

`tests/unit/scoring-v1.test.ts` covers: all-correct, all-incorrect,
all-unanswered, mixed difficulty/category breakdowns, the zero-questions
edge case (confirmed no `NaN`, midpoint default returned), STIMULUS
exclusion even when marked correct, and that scoring the same input twice
is deterministic. `tests/integration/results-creation.test.ts` covers the
DB-touching layer: `FREE_ACCESS` vs `LOCKED` assignment based on the user's
`isFreeTierEligible` flag, idempotent result creation, and that an
`EXPIRED` attempt is scored against its allotted deadline
(`expiresAt - startedAt`), not however long it sat abandoned before
anyone noticed (`submittedAt` would overstate completion time there).
`tests/integration/results-access.test.ts` covers the access layer,
including the single most important test in this phase: a `LOCKED`
result's JSON response contains zero score-related field names anywhere
in it, checked byte-level, not just "the UI doesn't render it."
