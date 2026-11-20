# Architecture

Status: Draft v1 — foundation phase. Companion to `docs/PRD.md` and
`docs/DATABASE.md`.

## 1. Decision log

| Decision | Choice | Why |
|---|---|---|
| App structure | Single Next.js (App Router) app for frontend + backend | Repo was empty; no reason to split. One deploy target, still satisfies SEO (SSR/SSG) and the "Server Components by default" requirement. User confirmed over a separate NestJS API. |
| Language | TypeScript, strict mode | Required by spec (Part 14). `any` must be justified with a comment. |
| Database | PostgreSQL + Prisma. **Dev**: local Postgres via Docker Compose (`docker-compose.yml`, port 5433) — user's call at the start of Phase 2, since no Supabase project existed yet. **Target**: Supabase (Postgres only, not its Auth/Storage/Realtime) once that project is created — switching is just a `DATABASE_URL` change, no code change. | Required by spec (Part 14/15). Supabase remains the intended host (user's earlier call); local Docker unblocks development now without waiting on account setup. |
| Cache/queue | Redis + BullMQ. **Dev**: local Redis via the same Docker Compose file (port 6380), introduced in Phase 2 — moved earlier than planned because rate limiting (Part 13, non-negotiable) needed it immediately for the auth endpoints that phase builds. | Required for background jobs (reminders, leaderboard recompute, referral qualification side-effects), rate limiting (now), leaderboard caching (later). |
| Payments | Stripe | User confirmed. Abstracted behind a `PaymentProvider` interface (`lib/payments/provider.ts`) so another gateway can be swapped in by implementing the interface + config flag — never a rewrite. |
| Email | Gmail SMTP via Nodemailer, behind an `EmailProvider` interface | User confirmed as a short-term choice (free tier ~500/day), explicitly to be revisited weekly. No business logic may depend on which provider is active. |
| Auth | Custom session-based auth (httpOnly cookie + signed session token), OTP + magic-link — not NextAuth, not Supabase Auth | NextAuth's built-in email provider is magic-link-only. Supabase Auth does support OTP/magic-link, but it owns a separate `auth.users` table, which would push the free-tier atomic-allocation and referral-attribution logic (the most concurrency-sensitive part of this spec) into a Postgres trigger instead of a directly testable Prisma transaction in our own code. User confirmed custom auth after weighing this tradeoff explicitly. Custom auth keeps session/deadline logic entirely server-controlled, which the spec repeatedly requires ("never trust the frontend"). |
| OAuth (Google, LinkedIn) | Added post-Phase-11, user-requested reversal of the "no social login" non-goal (`docs/PRD.md` §7). Built with `arctic` (thin OAuth2/PKCE client, no session/user-table ownership) on top of the *existing* custom session (`lib/auth/session.ts`/`cookies.ts`, unchanged) and a new `lib/auth/oauth/account.ts` find-or-create that reuses `allocateFreeTierSlot`/`attributeReferral` directly — not NextAuth/Supabase Auth, same reasoning as the row above. | The original custom-auth reasoning (free-tier/referral logic must stay in a directly-testable Prisma transaction) applies identically to OAuth sign-in — a framework that owns the user table would face the same problem for Google/LinkedIn accounts as it would have for email ones. |
| Testing | Vitest (unit/integration) + React Testing Library + Playwright (e2e) | Required by spec. |
| Monitoring | New Relic (deferred to Phase 13) | Not needed to validate business logic in early phases; added once there's production traffic to observe. |
| Hosting (app/Redis/workers) | Postgres is settled (Supabase, row above). App host, Redis, and worker host are not finalized. Working assumption: Vercel (app) + managed Redis (Upstash) + a small always-on worker host (Railway/Fly.io) for BullMQ workers, since Vercel has no long-running process support | Revisit before Phase 14. Doesn't block any earlier phase. |
| Blog content format | `content/blog/*.mdx`, using MDX's **native** top-level `export const frontmatter = {...}` — not the `remark-frontmatter`/`remark-mdx-frontmatter` plugin pair originally sketched for this (Phase 11) | Passing remark/rehype plugin functions through `next.config.ts`'s MDX options isn't serializable under Turbopack (`next build` failed outright: "loader ... does not have serializable options"). MDX's own export syntax needs no plugin at all and sidesteps the problem entirely. `@mdx-js/rollup` is added separately, only for Vitest's Vite pipeline (`vitest.config.mts` — renamed from `.ts` to get real ESM, since this package is ESM-only and the project has no `"type": "module"`), so `tests/unit/seo-metadata.test.ts` can dynamically import real posts the same way the app does. |

## 2. High-level module map

```
app/
  (public)/                 # SEO-indexable routes — SSR/SSG, Server Components
    page.tsx                 # /
    free-iq-test/page.tsx
    online-iq-test/page.tsx
    logical-reasoning-test/page.tsx
    abstract-reasoning-test/page.tsx
    numerical-reasoning-test/page.tsx
    spatial-reasoning-test/page.tsx
    pattern-recognition-test/page.tsx
    how-it-works/page.tsx
    how-iq-is-calculated/page.tsx
    pricing/page.tsx
    faq/page.tsx
    blog/
      page.tsx
      [slug]/page.tsx          # dynamic-imports content/blog/[slug].mdx
    u/[publicSlug]/
      page.tsx                 # Phase 11 — see note above the module map
      opengraph-image.tsx      # next/og ImageResponse, same visibility gate
    daily-challenge/[date]/page.tsx   # not yet built — Part 11 marketing
                                       # phase, separate from this roadmap's
                                       # Phase 11 (social sharing + SEO content)
  (auth)/                   # noindex — login, register, verify
    login/page.tsx
    register/page.tsx
    verify/page.tsx
  # Authenticated pages actually live flat under app/ (app/dashboard,
  # app/assessment/[attemptId]), not inside an (app) route group as
  # originally sketched here — Phase 2 built dashboard flat, and Phase 5
  # kept that precedent rather than retrofitting it for a purely cosmetic
  # (route groups never affect URLs) reorganization. Noindex is set via
  # each page's own metadata either way.
  dashboard/page.tsx
  assessment/[attemptId]/page.tsx
  results/[attemptId]/page.tsx          # not yet built — Phase 6
  r/[code]/page.tsx          # referral landing redirect (captures code, 302 → /register?ref=)
  # u/[publicSlug]/page.tsx — actually lives inside (public)/ (Phase 11),
  # not flat as originally sketched here: unlike r/[code] (a bare
  # redirect, nothing to render), this is a real content page meant to
  # drive virality, so it gets the same PublicHeader/PublicFooter as
  # every other SEO surface. Route groups don't affect the URL either
  # way — it's still served at /u/[publicSlug].
  admin/                      # noindex, role-gated
    questions/...
    assessments/...
    referrals/...
    payments/...
    analytics/...
  api/
    auth/{register,login,verify-otp,verify-magic-link,logout}/route.ts
    auth/oauth/[provider]/{start,callback}/route.ts  # Google/LinkedIn, post-Phase-11
    assessment/{start,[attemptId]/answer,[attemptId]/submit,[attemptId]/state}/route.ts
    results/[attemptId]/route.ts
    unlock/{payment/create-intent,referral/status}/route.ts
    payments/webhook/stripe/route.ts
    referrals/{code,qualify-check}/route.ts
    admin/**/route.ts
    cron/send-reminders/route.ts        # triggered by scheduler, enqueues jobs
    daily-challenge/route.ts

lib/
  auth/           # session issuance/verification, OTP + magic-link, RBAC guards
  db/              # Prisma client singleton, transaction helpers
  scoring/         # pure, independently-testable scoring engine (docs/SCORING.md)
  assessment/      # question selection, randomization, timer/deadline logic
  referrals/       # qualification state machine (docs/REFERRAL_RULES.md)
  payments/        # PaymentProvider interface + Stripe implementation
  email/           # EmailProvider interface + Gmail SMTP implementation, templates
  reminders/       # eligibility query, idempotent send, unsubscribe token (Phase 9)
  jobs/            # BullMQ connections + queue definitions (reminders, leaderboard; qualification stays synchronous — see §5)
  gamification/    # XP, levels, badges, leaderboard recompute/read, visibility Server Action (Phase 10). Streaks/daily
                    # challenges are requirement.txt Part 7 items deliberately not built this phase — no schema support
                    # (no streak field, no DailyChallenge model) and not in this phase's file list; see §7.
  config/          # typed access to system_settings (assessment config, reminder interval, etc.)
  seo/             # metadata builders, JSON-LD builders, sitemap/robots generators,
                    # category-content.ts (Phase 11 category-page copy)
  sharing/         # certificate create/update, visibility-filtered public-card read (Phase 11)
  blog/            # posts.ts — BLOG_SLUGS + frontmatter/post lookup over content/blog/*.mdx (Phase 11)
  rate-limit/      # Redis-backed limiter middleware

prisma/
  schema.prisma
  seed.ts            # seeds question bank + system_settings defaults

workers/
  index.ts             # BullMQ worker process entrypoint (separate deploy
                        # target, run via `npm run worker`) — starts both
                        # workers below and self-schedules the leaderboard
                        # recompute job
  reminder.worker.ts    # implemented, Phase 9
  leaderboard.worker.ts # implemented, Phase 10
  # qualification.worker.ts — not built; referral qualification remains
  # synchronous (see §5), no current phase needs it as a real queue

content/
  blog/*.mdx          # original articles, Part 10 content marketing

components/
  ui/                 # design-system primitives, accessible, reusable
  assessment/         # quiz runner, timer, progress, navigator
  results/             # score reveal, breakdown charts, locked-result screen
  sharing/              # ShareSheet (platform links, native share, copy
                        # link) + CertificateShare (visibility toggles),
                        # implemented Phase 11
  seo/                  # JsonLd, CategoryLandingPage (Phase 11)
  blog/                 # SequenceDiagram/MatrixDiagram — small, dependency-
                        # free visual aids used inside .mdx posts (Phase 11)

mdx-components.tsx    # required by @next/mdx for the App Router; the one
                       # place blog post HTML elements get their styling

tests/
  unit/
  integration/
  e2e/                # Playwright specs
```

## 3. Why Route Handlers, not Server Actions, for business-critical paths

Server Actions are convenient but blur the line between "UI event" and
"API contract," and are harder to webhook-test in isolation. Every endpoint
that is security- or money-sensitive (assessment submit, payment webhook,
referral qualification, admin writes) is a plain Route Handler under `app/api`
with its own integration test. Server Actions are allowed only for low-risk,
purely-UI mutations (e.g., toggling leaderboard visibility) where the same
authorization checks still apply server-side.

## 4. Concurrency-sensitive paths (never trust the client)

1. **Free-tier allocation (first 10 users).** Enforced with a single atomic
   `UPDATE` against a counter row with a `WHERE` guard and `RETURNING`,
   inside the same transaction as marking the user's email verified. See
   `docs/DATABASE.md` §Free-tier allocation for the exact statement. No
   read-then-write race window.
2. **Referral qualification.** A referral flips `PENDING → QUALIFIED` only
   inside a DB transaction triggered by the referred user's assessment
   completion event, after anti-abuse checks pass. The qualifying event is
   idempotent per `referral_id` (unique constraint), so a retried job or
   duplicate event can't double-count.
3. **Payment webhook processing.** Stripe webhook signature verified first
   (`stripe.webhooks.constructEvent`, pure local HMAC over the raw body —
   no network call), so a tampered or wrongly-signed payload never reaches
   any side effect. Idempotency mirrors referral unlock's split (point 2):
   a `payment.status` check up front handles the common case — a webhook
   redelivered after it was already processed — and the
   `ResultUnlock.assessmentResultId` unique constraint is the actual
   concurrency-safe backstop for two deliveries racing in at once. The
   triggering Stripe `event.id` is recorded on the payment row
   (`webhookEventId`) alongside the status flip, as an audit trail rather
   than the idempotency gate itself. See `lib/payments/webhook.ts`.
4. **Assessment timer/deadline.** `assessments.expires_at` is set server-side
   at start and is the only source of truth. The client timer is cosmetic.
   Implemented as **lazy auto-finalization** (`lib/assessment/submit.ts`
   `autoFinalizeIfExpired`): every call to state/answer/submit/start checks
   first whether the attempt is `IN_PROGRESS` past `expires_at` and, if so,
   flips it to `EXPIRED` before doing anything else — so "automatically
   submit when time expires" holds without a cron actually running. The
   `auto-submit-expired-assessments` background job below is still a real
   gap for one specific case: a session nobody ever looks at again (user
   closes the tab and never returns) stays `IN_PROGRESS` in the DB
   indefinitely, which is a data-hygiene/analytics issue, not a
   user-facing correctness one — the moment anyone (the user, an admin, a
   future job) does look at it, it resolves correctly. Building that
   proactive sweep is deferred to whenever BullMQ/worker infrastructure
   actually gets built (no phase currently schedules it explicitly — flag
   this when planning Phase 7+).

## 5. Background jobs (BullMQ + Redis)

| Job | Trigger | Responsibility |
|---|---|---|
| `auto-submit-expired-assessments` | Recurring (every 1 min) | Finds `IN_PROGRESS` assessments past `expires_at`, submits + scores them. |
| `referral-qualification-check` | **Implemented synchronously instead** (Phase 7) — called directly inside `finalizeAssessment`, not enqueued, since no BullMQ/worker infrastructure exists yet. Re-checks the referring relationship, flags (never blocks) on the same-IP heuristic, flips state, grants unlock if the qualified-referral threshold is met. As of Phase 10, also awards `REFERRAL_QUALIFIED` XP and evaluates the `REFERRAL_CHAMPION` badge for the referrer, same synchronous call site (`lib/referrals/qualification.ts`). |
| `send-weekly-reminder` | **Implemented** (Phase 9) — `POST /api/cron/send-reminders` (secret-protected, called by an external scheduler not built yet; see §7) finds everyone due and enqueues one `send-reminder` job per user onto a real BullMQ queue (`lib/jobs/reminders-queue.ts`); a real worker process (`workers/reminder.worker.ts`, run via `npm run worker`) processes them. The reminder row (`email_reminders`) is created *first*, as a reservation, before the email is sent (`lib/reminders/send.ts`) — idempotency key is `(userId, reminderNumber)`, not a week bucket as originally sketched here (simpler: an incrementing per-user counter sidesteps calendar-week-boundary edge cases entirely). This is the first job in this table to actually run through BullMQ rather than synchronously — every job above it was deferred to "synchronous for now" specifically because no worker process existed; this phase is what finally justified building one, since "remind weekly" has no request to hang the work off of. |
| `recompute-leaderboard` | **Implemented** (Phase 10) — unlike `send-weekly-reminder`, this is self-scheduling: a BullMQ **Job Scheduler** (`lib/jobs/leaderboard-queue.ts`, `upsertJobScheduler`, every 5 minutes) rather than an external HTTP cron caller, since there's no per-user eligibility to compute — nothing external needs to decide *when* to run it. Processed by `workers/leaderboard.worker.ts`. Recomputes `leaderboard_entries` (GLOBAL/WEEKLY/MONTHLY) directly from `xp_transactions` via a full delete-and-rebuild per `(period, periodKey)` — not an incremental update, so a user who just opted out of `publicLeaderboardOptIn` disappears on the very next run rather than lingering. `leaderboard_entries` (Postgres) is the actual snapshot; no Redis caching layer was added on top of it (the §1 decision log's "leaderboard caching (later)" remains deferred — a materialized Postgres table, indexed on `(period, periodKey, rank)`, was fast enough to not need one yet). |
| `payment-webhook-reconcile` | Recurring (hourly) | Safety net: reconciles any `PENDING` payments older than N minutes against Stripe's API directly, in case a webhook was missed. |

Workers run as a separate long-running process (`workers/index.ts`) so they
are unaffected by serverless function timeouts; this is why hosting needs a
host that supports always-on processes, not Vercel functions alone.

## 6. Auth design (summary — detail can expand in a future ADR if needed)

- Registration is **passwordless** (confirmed) — register captures email
  (+ optional display name), a 6-digit OTP (or magic link, user's choice at
  the point of verifying) is sent, verifying the OTP/link both verifies the
  email *and* logs the user in, issuing a session cookie. No password field
  exists anywhere in the product.
- **Social login** (Google, LinkedIn — added post-Phase-11) is a third,
  parallel path, not a replacement: `lib/auth/oauth/{config,providers,
  account,provider-param}.ts`, `app/api/auth/oauth/[provider]/{start,
  callback}/route.ts`. The provider's attested email counts as verified
  immediately (no separate OTP step) — this is the exact moment free-tier
  allocation and referral attribution run for a brand-new account, via
  `lib/auth/oauth/account.ts`'s `findOrCreateOAuthUser`, which reuses
  `allocateFreeTierSlot`/`attributeReferral` rather than re-deriving
  either guarantee. A new `OAuthAccount` table links provider identities
  to `User` rows (`docs/DATABASE.md`); `User` itself gained no new
  columns. State/PKCE for the authorization-code flow live in short-lived
  httpOnly cookies, not the DB — purely transient, nothing worth
  persisting or querying later.
- Session: signed, httpOnly, `SameSite=Lax` cookie containing a session ID;
  session rows in `user_sessions` can be revoked server-side (logout
  everywhere, admin-forced logout).
- RBAC: `users.role` enum (`USER`, `ADMIN`); every admin route handler and
  page checks role server-side; middleware only does cheap cookie-presence
  redirects, never authorization.

## 7. What's explicitly deferred past the foundation phase

- New Relic/OpenTelemetry wiring (Phase 13).
- Final production hosting for the app, Postgres (Supabase), Redis, workers,
  + CDN/object-storage selection (Phase 14) — all run locally via Docker for
  dev today (`docker-compose.yml`), see §1 decision log.
- i18n, native apps, OAuth login (non-goals, §7 of PRD).
- **Streaks and daily challenges** (requirement.txt Part 7, listed alongside
  XP/levels/badges/leaderboards). Deliberately not built in Phase 10 — a
  scoping decision made and documented while implementing, not a silent
  drop: unlike the rest of Part 7, these need their own content model (a
  `DailyChallenge` table, an admin content/rotation pipeline, defined
  streak-break semantics) that the Phase 10 roadmap stub's file list never
  scoped in (only `achievements`, `user_achievements`, `xp_transactions`,
  `leaderboard_entries`), and no schema exists for either today — no
  streak counter field on `User`, no daily-challenge content model. The
  `XpReason.DAILY_CHALLENGE` enum value (seeded since the Foundation
  phase) is left in place, unused, for whenever this gets its own phase.
  `/api/daily-challenge` (docs/API.md §6) remains an undocumented-behavior
  stub for the same reason — routed but never implemented.
