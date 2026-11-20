# Performance

Status: Draft v1 — foundation phase. Implements Part 12 of requirement.txt.
Non-negotiable per spec; validated, not assumed.

## 1. Core Web Vitals targets (p75, real users)

| Metric | Target |
|---|---|
| LCP | ≤ 2.5s |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 |

Measured via New Relic Browser (Phase 13) once there's real traffic;
validated pre-launch via Lighthouse CI / WebPageTest against staging on a
throttled mobile profile. "Validate actual results rather than assuming
these targets are automatically met" (spec) means every phase that ships a
public page runs a Lighthouse pass before being called done — see
`docs/DEVELOPMENT_ROADMAP.md` acceptance criteria per phase.

**Phase 3 baseline (2026-11-18, local `next start`, unthrottled — not a
substitute for throttled-mobile CI once that exists in Phase 13):**
homepage (`/`) scored Performance 100, SEO 100, Accessibility 100. LCP
756ms, CLS 0, TBT 30ms — all comfortably under budget. **JS transfer size
was 151.4 KB, right at the 150 KB budget edge**, almost entirely Next.js/
React framework runtime rather than app code (the homepage itself has zero
client components). This is the floor, not typical page weight — watch it
closely once the quiz runner, admin panel, or any other client-heavy
feature adds real client-side code on top of this baseline, and re-measure
rather than assume it still fits.

## 2. Budgets

| Budget | Target |
|---|---|
| Homepage JS (compressed) | ≤ 150 KB |
| Critical CSS (compressed) | ≤ 50 KB |

Enforced via `next build` bundle analysis in CI (added once CI exists,
Phase 1) — a budget regression should fail the build, not just get noticed
later.

## 3. Frontend rules

- Server Components by default; a component only becomes a Client Component
  when it needs interactivity/state (quiz runner, timer display, admin
  forms) — not by default for convenience.
- Dynamic `import()` + route-level code splitting for anything not needed on
  first paint (admin panel, charts library on the results page, share-sheet
  icons).
- Images via `next/image`, AVIF/WebP, explicit dimensions to avoid CLS.
- Fonts via `next/font` (self-hosted, no render-blocking third-party font
  requests), `font-display: swap`.
- No third-party scripts on the homepage beyond what's strictly required
  (analytics loaded via `next/script` with an appropriate strategy, not
  render-blocking).
- The quiz runner avoids re-rendering the full question list on every timer
  tick: the real (server-authoritative, never displayed — see
  `docs/DEVELOPMENT_ROADMAP.md` Phase 5's post-Phase-11 UI redesign note)
  deadline watch ties no React state to its tick at all, so it causes zero
  re-renders; the per-question pacing bar (`QuestionTimerBar`, cosmetic
  only) is its own isolated, remounted-per-question component instead.
  Answer-selection state updates only the affected question's component.

## 4. Backend rules

- Prisma queries indexed per actual access patterns (e.g.,
  `assessments(user_id, status)`, `assessment_answers(assessment_question_id)`
  unique, `leaderboard_entries(period, period_key, rank)`) — indexes are
  added alongside the query that needs them, not spitballed in isolation; see
  `docs/DATABASE.md` for constraints, final index list lands in the Prisma
  schema during Phase 2.
- Connection pooling via Prisma's built-in pool / PgBouncer if the hosting
  target needs it (revisit at Phase 14 when hosting is finalized).
- N+1 avoidance: list endpoints (admin question list, leaderboard, results
  breakdown) use `include`/`select` with explicit relations, verified by
  reading the generated SQL in dev, not assumed safe.
- Redis used for: rate limiting, leaderboard read cache, session lookups if
  they become a hot path.
- Pagination on every admin list endpoint and the leaderboard API (cursor or
  offset, documented per endpoint in `docs/API.md` as it's implemented).
- Structured JSON logging from day one (even before New Relic is wired up),
  so API latency and error patterns are inspectable in any environment.
- Rate limiting on auth, payment-intent creation, and referral-code
  generation (`docs/API.md` §9).

## 5. Quiz-specific performance

- Question set and current answers loaded once on `assessment/start`/`state`,
  then updated incrementally — no full-page refetch per answer.
- Timer is a pure client-side ticking display computed from the
  server-provided `expires_at`; it never makes a network request per tick.
- Answer submission is debounced/optimistic on the client but always
  confirmed against the server's `expires_at` and ownership check
  (`docs/ARCHITECTURE.md` §4.4) — perceived speed without sacrificing the
  "never trust the frontend" rule.
- Network-failure recovery: answer-submit requests retry with backoff and
  queue locally (e.g., in-memory + `sessionStorage` snapshot) so a flaky
  connection doesn't silently drop an answer; the server remains the source
  of truth on reconnect (`GET state` re-syncs the client).

## 6. Monitoring (Phase 13, not blocking earlier phases)

New Relic (or OpenTelemetry-compatible equivalent) wired for: Core Web
Vitals, frontend JS errors, API latency, HTTP error rate, DB query latency,
CPU/memory, Node.js event-loop lag, background-job failures, payment
failures, email delivery failures — matching the monitoring list in Part 12.
Deferred because it has nothing to observe until there's a running app with
traffic; it is sequenced into the roadmap explicitly so it doesn't get
forgotten once that's true.
