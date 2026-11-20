# API Surface

Status: Draft v1 — foundation phase. All routes below are Next.js Route
Handlers under `app/api/`, unless marked Server Action. Every authenticated
route validates the session server-side and every admin route additionally
checks `role = ADMIN`. Request/response bodies are illustrative, not final.

## 1. Auth

| Route | Method | Notes |
|---|---|---|
| `/api/auth/register` | POST | `{ email, displayName?, referralCode? }`. Creates user (unverified), attributes a referral if a valid code was supplied, creates an OTP + magic-link pair, sends one email containing both. 409 `already_registered` if the email exists — directs the caller to `/login` instead. Rate-limited per IP and per email. |
| `/api/auth/login` | POST | `{ email }`. For an **existing** user only — issues a fresh OTP + magic-link pair and emails it. Always returns the same `verification_sent_if_account_exists` response whether or not the account exists, to avoid leaking which emails are registered. Rate-limited per IP and per email. |
| `/api/auth/verify-otp` | POST | `{ email, code }`. Consumes the OTP (scoped by email **and** code hash together — see §8.1 on why), sets `email_verified_at` on first verification only, runs free-tier allocation (`docs/DATABASE.md` §3), invalidates the sibling magic-link row, issues a session cookie. |
| `/api/auth/verify-magic-link` | GET | `?token=`. Same consumption/allocation/session logic as OTP, different input; redirects to `/dashboard` on success or `/verify?error=...` on failure rather than returning JSON, since it's a link a user clicks from their inbox. |
| `/api/auth/logout` | POST | Revokes current `user_sessions` row, clears the cookie. |
| `/api/auth/session` | GET | Returns the current user's minimal public profile, or 401. Never returns another user's data. |
| `/api/auth/oauth/[provider]/start` | GET | `provider` ∈ `{google, linkedin}` (`400` → redirect to `/login?error=oauth_failed` otherwise, since this route is only ever reached via a plain `<a href>` link — see §1.1). Rate-limited 20/hour/IP. Builds the provider's authorization URL (PKCE for Google), stores `state`/`codeVerifier`/optional `?ref=` in short-lived (10 min) httpOnly cookies, redirects to the provider. Redirects to `/login?error=oauth_not_configured` if that provider's client id/secret aren't set in env — same "fail clean, don't fake it" precedent as Stripe (Phase 8) — never a crash. |
| `/api/auth/oauth/[provider]/callback` | GET | Validates the provider-echoed `state` against the cookie (CSRF check), exchanges `code` for tokens, decodes the OIDC `id_token` for `sub`/`email`/`name`, calls `findOrCreateOAuthUser` (§1.1), issues a session via the same `createSession`/`setSessionCookie` every other auth path uses, redirects to `/dashboard`. Any failure (bad state, provider error, decode failure) redirects to `/login?error=oauth_failed` rather than throwing. |

### 1.1 Social login (added post-Phase-11 — requirement.txt has no auth OAuth requirement; this reverses `docs/PRD.md` §7's "no social login" non-goal at the user's explicit request)

Google and LinkedIn sign-in are a **third path alongside**, not a
replacement for, email OTP/magic-link — the same account can eventually
be reached via either. `findOrCreateOAuthUser`
(`lib/auth/oauth/account.ts`) is the single entry point both callback
routes use:

1. An `OAuthAccount` already linked to this exact `(provider,
   providerAccountId)` → return its user (repeat login).
2. Else an existing `User` by email → link a new `OAuthAccount` to it;
   if that user's `emailVerifiedAt` was still null, this sign-in *is*
   their verification moment — the provider-attested email is treated
   exactly like a consumed OTP, running the same free-tier allocation
   (`docs/DATABASE.md` §3) and audit-log shape.
3. Else create a brand-new `User` with `emailVerifiedAt` set immediately,
   inside one transaction that also runs `attributeReferral` (identical
   to the email registration path — a referral code is threaded through
   via `/start`'s `?ref=` query param, stored in the same short-lived
   cookie as `state`) and `allocateFreeTierSlot`.

Race safety: a double-fired callback for the same provider account can
race on `User.email`'s or `OAuthAccount`'s unique constraint; the loser's
`P2002` is caught and resolved by re-reading what the winner committed
(same pattern as `lib/referrals/code.ts`). **Known, accepted gap**: two
*different* providers linking the same still-unverified email at the
exact same instant could each allocate a free-tier slot before either
commits — narrow enough to flag rather than solve, same class of gap as
the `payment-webhook-reconcile` note in `docs/ARCHITECTURE.md`.

## 2. Assessment

| Route | Method | Notes |
|---|---|---|
| `/api/assessment/start` | POST | If the caller has an existing `IN_PROGRESS` assessment, auto-finalizes it first if it's actually past `expires_at`, then returns it unchanged if still live (resumable — never a duplicate attempt while one is genuinely in progress). Otherwise selects the active `assessment_template` and, for each difficulty, draws exactly 1 random question per category from the `PUBLISHED` bank (a stratified draw — deterministically balanced across categories, but which specific question represents each category is random and varies across attempts, including retakes; see `lib/assessment/select.ts`), randomizes both overall question order and each question's option order, and creates `assessments` + `assessment_questions` with server-set `started_at`/`expires_at`. A prior `SUBMITTED`/`EXPIRED` attempt does **not** block starting a new one — retakes are unrestricted for now; configurable retake rules are a later admin-management feature, not yet built. |
| `/api/assessment/[attemptId]/state` | GET | Returns the full question set **with** each question's current answer state (`selectedOptionId`, `markedForReview`) and the server-authoritative `expires_at` — the only thing the frontend timer reads. Lazily auto-finalizes to `EXPIRED` first if the deadline has passed, so the returned `status` is always accurate. Ownership-checked: `forbidden` (403) if `attemptId` doesn't belong to the caller, `not_found` (404) if it doesn't exist. |
| `/api/assessment/[attemptId]/answer` | POST | `{ assessmentQuestionId, selectedOptionId?, markedForReview? }`. Upserts `assessment_answers`. Lazily auto-finalizes first; rejected with 409 `expired` if the assessment is no longer `IN_PROGRESS` (whether already `SUBMITTED` or just discovered to be past `expires_at`). Rejected with 400 `invalid_option` if `assessmentQuestionId` refers to a `STIMULUS` question — there's nothing to select on a memorize-this screen (see §2.1). |
| `/api/assessment/[attemptId]/submit` | POST | Idempotent: if already `SUBMITTED`/`EXPIRED`, returns the existing status unchanged rather than erroring — and if the deadline already passed, the status stays `EXPIRED` even on an explicit user-initiated submit, so a last-second race never relabels an expired attempt as a timely one. The transition to `SUBMITTED`/`EXPIRED` always triggers scoring exactly once (`lib/results/create-result.ts`, called from `finalizeAssessment` itself, not from this route — so lazy auto-finalizes from `state`/`answer`/`start` get scored too, not just explicit submits). |

### 2.1 Delayed-recall questions (STIMULUS + RECALL)

Added mid-Phase 5 after real testing showed that "memorize and answer in
the same question" isn't a real test of memory (see
`docs/DEVELOPMENT_ROADMAP.md` Phase 5 post-completion note). A `Question`
can be `kind: STIMULUS` (a non-scored "memorize this" screen) or
`kind: RECALL` (a scored question referencing a specific stimulus via
`stimulusQuestionId`) in addition to the default `STANDARD`.

- `selectQuestions` never draws a `STIMULUS` directly — it's pulled into
  the attempt only when its paired `RECALL` question is drawn by the
  normal per-category draw, and is spliced in at least `MIN_STIMULUS_GAP`
  (3) questions earlier in the sequence, so the recall is genuinely asked
  "later," not immediately after.
- A `STIMULUS` question is never scored, has no options, and the answer
  endpoint rejects any `selectedOptionId` against one.
- Admin: `POST /api/admin/questions` and `PATCH /api/admin/questions/[id]`
  accept `kind` and (for `RECALL`) `stimulusQuestionId`. Creating/updating
  a `RECALL` validates the referenced question exists, has `kind:
  STIMULUS`, and isn't already linked to a different recall. Publishing a
  `RECALL` is blocked until its stimulus is published. Archiving a
  `STIMULUS` cascades to archive its linked `RECALL` (a recall is
  meaningless without its stimulus ever having been shown).

## 3. Results

| Route | Method | Notes |
|---|---|---|
| `/api/results/[attemptId]` | GET | Ownership-checked (`forbidden`/`not_found`); `not_submitted` (409) if the assessment is still `IN_PROGRESS`/`NOT_STARTED`. Scoring runs once, automatically, the moment an assessment leaves `IN_PROGRESS` (wired into `finalizeAssessment`, not into this route) — by the time this is ever called, a result already exists. If `result_access_state` is `LOCKED`/`*_PENDING`, returns **only** `{ status: "locked", resultAccessState, questionsAttempted, completionTimeSeconds }` — correct-answer breakdown, raw score, and estimated score are not present in the JSON at all, not just hidden client-side (verified byte-level in tests and against the real running app). `questionsAttempted`/`completionTimeSeconds` are explicitly spec-sanctioned to show even locked; **XP earned and referral progress are not included yet** — those fields land once Phase 7 (referrals) and Phase 10 (gamification) actually exist, rather than being stubbed with fake zeros now. If unlocked, returns the full report (`rawScore`, `accuracyPercentage`, `correctCount`/`incorrectCount`/`unansweredCount`, `difficultyBreakdown`, `categoryBreakdown`, `completionTimeSeconds`, `estimatedScore`, `performanceLabel`, `scoringVersion`), and on first view transitions `result_access_state` to `RESULT_VIEWED` (idempotent — later views don't re-set `resultViewedAt`). |

## 4. Unlock

| Route | Method | Notes |
|---|---|---|
| `/api/unlock/payment/create-intent` | POST | Auth required. `{ assessmentId, idempotencyKey }`, where `idempotencyKey` is client-generated (a double-clicked "Pay" button resolves to the same PaymentIntent, never two). Ownership-checked (`forbidden`/`not_found`), rejects an unsubmitted assessment (`not_submitted`) and an already-unlocked result (`already_unlocked`). Creates a $1 Stripe PaymentIntent, stores a `payments` row (`PENDING`), and moves `result_access_state` to `PAYMENT_PENDING`. Returns `{ clientSecret, paymentId }` only — never a success/failure determination. If `STRIPE_SECRET_KEY` isn't set (no Stripe account configured yet), fails with `503 provider_not_configured` before writing anything to the DB — never a fake success. Rate-limited 10/hour per IP and per user. |
| `/api/payments/webhook/stripe` | POST | No auth — Stripe calls this directly. Signature verified against the raw (unparsed) body first via `stripe.webhooks.constructEvent` (pure local HMAC, no network call); an invalid/tampered signature returns `400` so Stripe retries, never a `200`. Idempotency is two-layered, mirroring `lib/referrals/unlock.ts`: a `payment.status` check up front (the common case — a redelivered webhook after we already processed it) plus the `ResultUnlock.assessmentResultId` unique constraint as the concurrency-safe backstop for two deliveries racing in at once. The triggering Stripe `event.id` is recorded on the payment row (`webhookEventId`) alongside the status flip, as an audit trail of what caused it. `payment_intent.succeeded` transactionally marks the payment `SUCCEEDED` and writes `result_unlocks` (`unlockMethod: PAYMENT`), then sends the confirmation email required by requirement.txt §2.2 step 8 (`buildPaymentConfirmationEmail`) — best-effort: a failure to send never undoes the unlock, and is deliberately not retried via a non-2xx response, since Stripe's retry would just hit the idempotency check above and never reach the send again anyway (added Phase 9, after being missed in Phase 8). `payment_intent.payment_failed` marks it `FAILED` and drops `result_access_state` back from `PAYMENT_PENDING` to `LOCKED` (never touches a result already unlocked some other way). `charge.refunded` marks the payment `REFUNDED` but deliberately does **not** re-lock an already-unlocked result — a refund is an audit/support signal, not an access-control event (same precedent as referral disqualification never revoking an existing unlock). **This is the only path that can mark a payment successful — the frontend "success" redirect never does**, since `confirmPayment` on the client only tells Stripe to attempt the charge; the result stays `PAYMENT_PENDING` until this webhook actually runs. |
| `/api/referrals/code` | GET | Returns the caller's referral code (creates one on first request via `getOrCreateReferralCode` — 8-char alphabet excluding ambiguous characters, collision-retried, idempotent). |
| `/api/referrals/progress` | GET | Returns `{ qualifiedCount, threshold }`, a read-only projection per `docs/REFERRAL_RULES.md` §5 — never a stored field. |
| `/api/admin/referrals` | GET | Admin-only. Lists referrals with referrer/referred email, qualification status, `flaggedSuspicious` (same-registration-IP heuristic). |
| `/api/admin/referrals/[id]/disqualify` | POST | Admin-only, audited (`{ reason }` required). Writes `audit_logs` (`REFERRAL_DISQUALIFIED`). Per spec, does **not** revoke a `ResultUnlock` the referral already contributed to — existing qualified referrals are never lost, only excluded from counting toward future thresholds. Idempotent on an already-`DISQUALIFIED` qualification. |

Qualification and unlock aren't separate jobs/endpoints — they're triggered
synchronously inside `finalizeAssessment` (`lib/assessment/submit.ts`) the
moment a *referred* user's own assessment reaches `SUBMITTED` (never
`EXPIRED`), and checked again at `AssessmentResult` creation time in case
the referrer already had enough qualified referrals before ever taking
their own assessment. See `lib/referrals/{qualification,unlock}.ts`.

## 5. Referral capture

| Route | Method | Notes |
|---|---|---|
| `/r/[code]` (page, not API) | GET | Redirects to `/register?ref=[code]` — a query param, not a cookie. The register page already reads `?ref=` directly and sends it as `referralCode` on signup (decided in Phase 2, before this page existed); this route is just the shareable short link into that, not a separate attribution mechanism. |

## 6. Public / content

| Route | Method | Notes |
|---|---|---|
| `/api/daily-challenge` | GET | Today's public puzzle + explanation, no auth required. |
| `/u/[publicSlug]` (page) | GET | Public shareable result card; filtered by `shareable_certificates.visibility_settings`; `noindex` unless the user has opted the specific card into indexing. Server Component calls `getPublicCertificateCard` directly — never a self-fetch over HTTP. |
| `/u/[publicSlug]/opengraph-image` | GET | Next.js file-convention OG image route (`next/og` `ImageResponse`) — reads the same visibility-filtered payload as the page, so a hidden field can't leak into the generated image either. |

### 6.1 Social sharing (requirement.txt Part 8, Phase 11)

| Route | Method | Notes |
|---|---|---|
| `/api/share/certificate` | POST | Auth required. `{ assessmentId, visibilitySettings }`. Ownership-checked (`forbidden`/`not_found`), requires the result to already be in an unlocked `resultAccessState` (`409 not_unlocked` otherwise — mirrors `getResultForUser`'s `UNLOCKED_STATES`, exported from `lib/results/access.ts` for reuse). Idempotent get-or-create-or-update (`lib/sharing/certificate.ts`): the `publicSlug` is generated once and never changes on repeat calls — only `visibilitySettings` updates — so a previously shared link never breaks. Returns `{ publicSlug, visibilitySettings }`. |
| `/api/share/[publicSlug]` | GET | Public, no auth. Returns the same visibility-filtered JSON the public page renders (`lib/sharing/public-card.ts`), `404` on an unknown slug. |

`CertificateVisibilitySettings` (`lib/sharing/types.ts`) is the concrete, documented shape of requirement.txt's "user-approved information": `{ showScore, showCategoryBreakdown, showBadges, indexable }`, all booleans. Each field is read by `getPublicCertificateCard` independently — a field the owner didn't opt into is **absent** from the response object (not `false`/`null`), so it's dropped by `JSON.stringify` rather than merely hidden client-side; `displayName` is always present (falls back to `Player <id prefix>`, same convention as the leaderboard). The pre-unlock generic invitation (`components/results/LockedResult.tsx`, via `components/sharing/ShareSheet.tsx`) is built from `buildPreUnlockShareText()` (`lib/sharing/copy.ts`), a pure function that takes no score input at all — it is impossible for that specific code path to leak a score, by construction, not just by convention. `ShareSheet` also provides the required LinkedIn/X/WhatsApp/Facebook/Telegram share-URL templates, a native Web Share API button (feature-detected at click time, not at mount, to avoid a hydration mismatch), and copy-link.

## 6.1 Gamification (requirement.txt Part 7, Phase 10)

| Route | Method | Notes |
|---|---|---|
| `/api/gamification/me` | GET | Auth required (`401` otherwise). Returns `{ xpTotal, level, nextLevelThreshold, badges: [{code, name, description, earnedAt}] }` — `lib/gamification/summary.ts`. `nextLevelThreshold` is `null` once at the top level (Mastermind). |
| `/api/leaderboard` | GET | No auth required — a public leaderboard is part of the product's virality/SEO surface. `?period=GLOBAL\|WEEKLY\|MONTHLY` (default `GLOBAL`; `400 invalid_period` otherwise). Returns `{ period, entries: [{rank, xpTotal, displayName, isCurrentUser}] }`, read from the `leaderboard_entries` materialized snapshot (`lib/gamification/leaderboard-read.ts`), **never** the user's email or id — `displayName` falls back to `Player <id prefix>` when unset. `isCurrentUser` is only ever `true` if the caller is logged in and on the list. |
| `/leaderboard` (page, not API) | GET | Same data as above, rendered with period tabs; part of `(public)` for SEO (JSON-LD, indexable). |

XP sources (`lib/gamification/xp.ts`): `ASSESSMENT_COMPLETED` (50 XP, awarded in `finalizeAssessment` only for a genuine user-initiated submit — never `EXPIRED`, same completion distinction Phase 7 draws for referral qualification) and `REFERRAL_QUALIFIED` (100 XP, awarded to the *referrer* in `checkAndQualifyReferral` the moment a referral qualifies). XP farming (requirement.txt Part 7) is prevented the same way every other "exactly once" guarantee in this codebase works: `xp_transactions`' `(userId, reason, referenceId)` unique constraint is the actual guarantee, not application logic — `referenceId` is the qualifying event's own id (an assessment id, so a legitimate retake still earns XP; a referral qualification id, so re-processing the same qualification never double-awards).

Badges (`lib/gamification/badges.ts`, `BADGE_DEFINITIONS` — also the seed source for the `achievements` table): `FIRST_CHALLENGE` (first submitted assessment), `PERFECT_ACCURACY` (100% on one assessment), `LOGIC_MASTER` / `PATTERN_DETECTIVE` (all-correct within the `logical-reasoning` / `pattern-recognition` category on one assessment), `CHALLENGE_CHAMPION` (5th submitted assessment), `REFERRAL_CHAMPION` (referrer reaches the referral qualification threshold). Each badge grants its own `BADGE_BONUS` XP once, via the same idempotent award path. **Documented assumption**: requirement.txt names these badges and example levels (`lib/gamification/levels.ts` — Beginner/Explorer/Thinker/Strategist/Mastermind at 0/150/400/800/1500 XP) but gives no XP numbers or exact earning conditions for either — both are concrete, tunable constants, not stored/migrated, so retuning them later needs no schema change.

Leaderboard visibility (`User.publicLeaderboardOptIn`, default `true`) is a **Server Action**, not a Route Handler — `lib/gamification/actions.ts` `setLeaderboardVisibility`, per docs/ARCHITECTURE.md §3's explicit "toggling leaderboard visibility" example of a low-risk, purely-UI mutation. The same `assertAuthenticated` check still runs server-side.

`leaderboard_entries` is a full delete-and-rebuild snapshot per `(period, periodKey)`, recomputed by `recomputeLeaderboards()` (`lib/gamification/leaderboard.ts`) — on a BullMQ **Job Scheduler** (`lib/jobs/leaderboard-queue.ts`, every 5 minutes, self-scheduling via `upsertJobScheduler`, no external HTTP trigger needed unlike the reminders sweep) processed by `workers/leaderboard.worker.ts`. `xp_transactions` is sums-of-truth; the snapshot exists so a leaderboard read is a cheap indexed query, not a live aggregation over every user on every page view. A full rebuild (not an incremental update) is what guarantees a user who just opted out disappears from a stale entry rather than lingering.

## 7. Admin (`/api/admin/**`, all require `role = ADMIN`)

| Route | Method | Notes |
|---|---|---|
| `/api/admin/questions` | GET/POST | List (optional `?status=`/`?difficulty=` filters) / create. Create requires category slug, difficulty, explanation, expected solving time, scoring weight, and `kind` (`STANDARD` default). `STANDARD`/`RECALL` also require 2–8 options with exactly one marked correct; `RECALL` also requires `stimulusQuestionId` (see §2.1); `STIMULUS` requires none of that. Starts in `DRAFT`. |
| `/api/admin/questions/[id]` | GET/PATCH/DELETE | Fetch/edit/archive. Editing a question that's already `PUBLISHED` auto-increments its `version` (docs/DATABASE.md §5); an `ARCHIVED` question can't be edited at all — create a new one instead. `DELETE` is the soft archive (never a hard delete). |
| `/api/admin/questions/[id]/publish` | POST | `DRAFT → PUBLISHED`, blocked unless the question has ≥2 options with exactly 1 marked correct. |
| `/api/admin/questions/bulk-import` | POST | JSON array of question objects (same shape as create), validated row-by-row — one bad row never aborts the rest of the batch. Returns `{ created: string[], errors: { index, message }[] }`. |
| `/api/admin/assessment-templates` | GET/POST/PATCH | Duration, counts, distribution, scoring weights, retake rules — versioned (`docs/DATABASE.md` §5), never mutates a template already referenced by a live assessment. |
| `/api/admin/referrals` | GET | Referral list, qualification status, suspicious-activity flags. |
| `/api/admin/referrals/[id]/disqualify` | POST | Writes `audit_logs`; see `docs/REFERRAL_RULES.md` §2. |
| `/api/admin/payments` | GET | Admin-only. Returns `{ payments, revenue }`: the 200 most recent transactions (status, provider, amount, `providerPaymentId`, owning user's email) and an aggregate summary (`succeededCount`/`succeededAmountCents`, `refundedCount`/`refundedAmountCents`, `failedCount`, `netRevenueCents`). Read-only — refunds happen in Stripe's own dashboard and reach the app only via the `charge.refunded` webhook, never a button here. |
| `/api/admin/analytics` | GET | Registrations, verification, assessment funnel, referral conversions, paid/free unlocks, revenue, reminder engagement — aggregated queries, cached briefly. |

## 7.1 Scheduled jobs & reminders (requirement.txt §2.4, Phase 9)

| Route | Method | Notes |
|---|---|---|
| `/api/cron/send-reminders` | POST | **Not** user- or admin-authenticated — called by an external scheduler (cron/Vercel Cron/etc.; the concrete choice is a Phase 14 hosting decision). Auth is a shared-secret bearer token: `Authorization: Bearer <CRON_SECRET>`, `401` otherwise. Finds everyone due for a reminder (`lib/reminders/eligibility.ts`) and enqueues one BullMQ job per user (`lib/jobs/reminders-queue.ts`) — the actual send happens asynchronously in `workers/reminder.worker.ts` (run via `npm run worker`, a separate long-running process from the Next.js app), not inline in this request, since a sweep could cover many users and serverless functions have a hard execution timeout. Returns `{ enqueued: number }`. |
| `/unsubscribe` (page, not API) | GET | `?userId=&token=`, where `token` is a deterministic HMAC (`lib/reminders/unsubscribe-token.ts`, same `AUTH_HASH_SECRET` primitive as session/OTP hashing) — no DB lookup needed to verify, so a link in an old email stays valid indefinitely. Sets `User.reminderUnsubscribedAt`, idempotently (a repeated click is a no-op, not an error). |

Eligibility (`findUsersDueForReminder`): a user whose most recent `SUBMITTED` assessment (never `EXPIRED` — same genuine-completion distinction Phase 7 draws for referral qualification) has a result not yet `RESULT_VIEWED`, who hasn't hit `reminder_max_count` reminders yet (configurable system setting, default 10), whose account isn't deleted or `reminderUnsubscribedAt`-set, and for whom `reminder_interval_days` (configurable, default 7) have passed since their last reminder (or since submission, if none sent yet).

**Unlocking and viewing are independent stop conditions** (requirement.txt: "stop when results are unlocked *and* viewed") — an already-unlocked-but-never-viewed result still gets reminded, just with different copy (`buildUnlockedReminderEmail`, no $1/referral call-to-action) than a still-locked one (`buildLockedReminderEmail`). The variant is chosen from the *current* `resultAccessState` at send time, not the state captured when the job was enqueued.

Idempotency is two-layered: `email_reminders`' `(userId, reminderNumber)` unique constraint is the real guarantee (the row is created, as a reservation, *before* the email is sent — `lib/reminders/send.ts`), and the BullMQ job's `jobId` (`${userId}-${reminderNumber}`) is a second, cheap layer in case a sweep runs twice before the first sweep's jobs finish. `sendReminderForUser` also re-checks live state (deleted/unsubscribed/viewed) at send time rather than trusting the snapshot taken when the job was enqueued.

**Known gap**: if the email provider itself throws (not a DB/idempotency failure), the reservation row is marked `deliveryStatus: "failed"` and the slot is not retried at the same `reminderNumber` — the next sweep simply sends `reminderNumber + 1` on schedule. Self-healing, but that one reminder is permanently skipped rather than retried. Same class of documented gap as `payment-webhook-reconcile` (docs/ARCHITECTURE.md §5).

## 8. What the public question/assessment API must never expose

Enforced by dedicated serializers (`lib/assessment/serialize.ts`) and covered
by an integration test that asserts these fields are **absent from the JSON
body**, not just unused by the UI:

- `question_options.is_correct`
- `questions.explanation`
- `assessment_results.raw_score` / `estimated_score` / breakdowns, while
  `result_access_state` is not an unlocked state
- Any other user's data, via ownership checks on every `[attemptId]`/`[id]`
  route

## 9. Rate limiting (via `lib/rate-limit`, Redis-backed)

Implemented from Phase 2 onward (moved earlier than originally planned,
since it's a hard requirement on the auth endpoints built in that phase —
see `docs/ARCHITECTURE.md` §1 decision log). Applied at minimum to:
`register` (5/hour/IP, 3/hour/email), `login` (10/hour/IP, 5/hour/email),
`verify-otp` (20/15min/IP, 10/15min/email), `verify-magic-link`
(30/15min/IP), `oauth/[provider]/start` (20/hour/IP, post-Phase-11),
`unlock/payment/create-intent` (10/hour/IP, 10/hour/user, as
of Phase 8) — the registration/verification/payment surfaces most
attractive to abuse. A fixed-window Redis counter (`INCR` + `EXPIRE`);
exceeding the limit returns HTTP 429. **Known gap:** `referrals/code`
generation (Phase 7) was never actually wired up to `enforceRateLimit`
despite being named in this section originally — low practical risk since
it's idempotent per user (`getOrCreateReferralCode`) and gated behind
authentication, but it should be closed before relying on this section as
a complete list.

## 9.1. OTP lookup scoping (why email + code together, not code alone)

A 6-digit OTP has only 1,000,000 possible values. If two different pending
verifications happened to share the same code at the same time, looking it
up by code hash alone could match the wrong user's record. `consumeOtp`
therefore always scopes the lookup by **email and code hash together**
(`lib/auth/verification.ts`), never by code hash alone. Magic-link tokens
are 256-bit random values and are looked up globally, since a collision
there is not a practical concern.
