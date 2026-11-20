# CLAUDE.md

Project instructions for Claude Code working in this repository. Keep this
file consistent with `AGENTS.md` — they must never diverge in substance.

## What this is

A premium online cognitive-assessment platform (not a simple quiz app) with
assessment logic, payments, referrals, gamification, SEO, and an admin
panel. Full business requirements: `requirement.txt` (authoritative source —
never contradict it). Everything derived from it lives in `docs/`:

- `docs/PRD.md` — product scope, personas, non-goals/anti-goals, assumptions.
- `docs/ARCHITECTURE.md` — stack decisions, module map, concurrency-sensitive
  paths, auth design.
- `docs/DATABASE.md` — schema, ER diagram, free-tier atomicity mechanism,
  state machines reference.
- `docs/API.md` — route-by-route contract, what must never be exposed.
- `docs/REFERRAL_RULES.md` — referral/result-access state machines, anti-abuse.
- `docs/SCORING.md` — scoring engine methodology and versioning rules.
- `docs/SEO_STRATEGY.md` — keyword/page map, technical SEO checklist.
- `docs/PERFORMANCE.md` — Core Web Vitals budgets, frontend/backend rules.
- `docs/DEVELOPMENT_ROADMAP.md` — phased plan; **work one phase at a time**.

Read the relevant doc before touching a feature area — don't re-derive
decisions already made there, and don't contradict them silently; if a
decision there looks wrong, raise it rather than overriding it in code.

## Non-negotiable rules (do not relitigate these per-task)

1. **Never trust the frontend** for scores, assessment deadlines, referral
   qualification, payment status, free-tier eligibility, or unlock
   permissions. Every one of those is enforced server-side, full stop.
2. **Free-tier allocation** (first 10 verified users) must use the atomic
   guarded-counter pattern in `docs/DATABASE.md` §3 — never read-then-write.
3. **Payment webhooks** are the only source of payment-success truth; a
   frontend redirect is never sufficient. Webhook handling must be
   idempotent (`docs/API.md` §4, `docs/ARCHITECTURE.md` §4.3).
4. **Referrals are immutable** once created; qualification can move
   `PENDING → QUALIFIED → DISQUALIFIED` per `docs/REFERRAL_RULES.md`, but a
   referral relationship itself is never rewritten or deleted.
5. **The public question/assessment API never returns** `is_correct`,
   `explanation`, or a locked result's score/breakdown — verified by
   integration tests, not just unused by the UI.
6. **Scoring is versioned**; historical results are never recomputed when
   the methodology changes (`docs/SCORING.md` §4).
7. **Never label the output "IQ"** or imply clinical/professional
   validation — "Estimated Cognitive Performance Score" only
   (`docs/PRD.md` §6).
8. Email provider is Gmail SMTP for now, behind `lib/email`'s
   `EmailProvider` interface — write code against the interface, never
   against Gmail/Nodemailer specifics directly in business logic. The user
   plans to revisit this choice weekly.
9. Payment provider is Stripe behind `lib/payments`' `PaymentProvider`
   interface — same rule.
10. No `any` in TypeScript without a comment justifying it. Strict mode.

## Workflow

- Follow `docs/DEVELOPMENT_ROADMAP.md` phase order. Don't start a later
  phase's files before the current phase's acceptance criteria are met.
- Every feature needs: backend logic, DB persistence, frontend integration,
  authorization, validation, error handling, passing tests — a UI-only or
  mocked implementation is not "done" (Part 16/17 of requirement.txt).
- Write tests alongside the code (unit for pure logic like `lib/scoring`,
  integration for API routes, Playwright for user-facing flows), prioritized
  per `docs/DEVELOPMENT_ROADMAP.md`'s per-phase test lists.
- Run typecheck, lint, build, and relevant tests before calling a phase
  done.
- Update the relevant `docs/*.md` file in the same change when a decision
  changes or a phase completes — don't let docs drift from code.
- Don't implement multiple roadmap phases in one enormous change; keep
  phases independently reviewable.

## Open items requiring a human decision before relevant work starts

- Final hosting target is unresolved (`docs/ARCHITECTURE.md` decision log) —
  doesn't block Phases 1–13, needed before Phase 14.
