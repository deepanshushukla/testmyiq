# Product Requirements Document

Status: Draft v1 — foundation phase
Owner: Product/Engineering (solo build, see `docs/DEVELOPMENT_ROADMAP.md`)

## 1. Product name

Undecided. The codebase must reference the product only through a configurable
value (`NEXT_PUBLIC_APP_NAME`, `system_settings.app_name`), never hardcoded
branding, copy, or asset filenames.

## 2. Vision

A premium, timed cognitive-assessment web product, inspired by the UX of
myiq.com but with **original** questions, illustrations, and copy. Users take
a 30-question timed assessment, get a detailed breakdown of their performance,
and unlock the full report either by paying $1 or by referring two friends who
also qualify. The platform layers in gamification (XP, levels, badges,
streaks, leaderboards), social sharing, and an SEO-led content/acquisition
strategy, because organic traffic is the primary growth channel (Part 11).

The scored output is explicitly **not** presented as a validated IQ score —
see §6, Compliance.

## 3. Primary user journeys

1. **Discovery → signup**: lands on an SEO page (`/free-iq-test`, blog, daily
   challenge) → registers with email → verifies via OTP or magic link.
2. **Assessment**: starts a 30-question, 20-minute, server-timed assessment →
   answers persist incrementally → auto-submits on expiry or manual submit.
3. **Result reveal**:
   - First 10 verified users ever → full report immediately, free.
   - Everyone else → locked-result screen → unlock via $1 Stripe payment or by
     getting 2 referred users to register + verify + complete + pass
     anti-abuse checks.
4. **Engagement loop**: XP/levels/badges accrue from assessment completion and
   referrals; leaderboards (global/weekly/monthly, opt-in visibility); users
   who complete but don't unlock get a reminder email every 7 days.
5. **Share loop**: pre-unlock share is a generic "I took the test" invite
   (score never exposed); post-unlock share generates a personalized OG card
   and a public, privacy-respecting verification URL.
6. **Admin**: question bank CRUD + bulk import, assessment config (duration,
   counts, distribution, scoring weights, retake rules), referral/payment
   oversight, platform analytics.

## 4. Personas

- **Test-taker** — curious visitor from search or a friend's share link, wants
  a fast, credible-feeling result.
- **Referrer** — already unlocked, incentivized to invite 2 friends.
- **Admin** — manages question bank, assessment config, and reviews
  payment/referral/fraud signals. No public signup path; role-gated.

## 5. Functional scope (Part 1–9 of requirement.txt, summarized)

See requirement.txt for the authoritative business rules. This PRD does not
restate them verbatim; it is kept consistent with:

- §2.1 First-10-free allocation, race-safe (`docs/DATABASE.md` §Free-tier
  allocation, `docs/ARCHITECTURE.md` §Concurrency-sensitive paths).
- §2.2–2.3 Payment and referral unlock paths, result-access state machine
  (`docs/REFERRAL_RULES.md`, `docs/DATABASE.md` §State machines).
- §2.4 Weekly reminder emails (`docs/DEVELOPMENT_ROADMAP.md` Phase 9).
- Part 3–5 Question bank, assessment engine, scoring engine
  (`docs/SCORING.md`).
- Part 7–8 Gamification and social sharing (Phase 10–11).
- Part 9 Admin panel (Phase 4, 7, 8 incremental admin surfaces).

## 6. Compliance / framing constraints

- The output is an **"Estimated Cognitive Performance Score,"** never labeled
  IQ, clinically validated, or professionally certified, until a real norming
  methodology exists.
- No fake ratings, reviews, or scientific certifications anywhere in content
  or structured data (Part 10).
- All questions/illustrations/copy must be original; no myiq.com branding,
  copyrighted content, or proprietary design copied.

## 7. Non-goals (v1)

- No native mobile app — responsive web only.
- No multi-language/i18n — English only for v1.
- No third-party IQ-certification partnerships.
- No subscription/recurring billing — single $1 unlock only.
- ~~No social login (Google/Apple OAuth)~~ — **reversed 2026-11-20**: the
  user asked for Google and LinkedIn sign-in explicitly, added alongside
  (not replacing) email OTP/magic-link. Apple was never requested and
  still isn't built. See `docs/ARCHITECTURE.md` decision log for how this
  was added without reopening the free-tier/referral concurrency concerns
  the original non-goal was partly protecting against.
- No native mobile push notifications — email only for reminders.

## 8. Anti-goals (would make this a failure even if "technically working")

- Any path where a frontend value (score, timer deadline, payment status,
  referral qualification, free-tier eligibility) is trusted by the backend.
- More than 10 complimentary free-access grants, ever, under any concurrency
  scenario.
- A user able to see their score before unlocking through network response
  inspection, hidden DOM state, or public API.
- Duplicate XP/referral credit from the same qualifying event (double-firing
  webhooks, duplicate job runs, retried requests).
- SEO pages that are thin/duplicate just to rank, or private routes
  (dashboard, active assessment, admin, payment callback) leaking into the
  sitemap or search index.
- A Lighthouse/Core Web Vitals regression shipped without being measured.

## 9. Success signals (directional, not contractual)

- Registration → verified-email conversion.
- Assessment start → completion conversion.
- Locked-result → unlock conversion (split by payment vs. referral).
- Referral loop k-factor (qualified referrals per unlocked user).
- Organic (search) share of total traffic to landing/blog pages.
- p75 LCP/INP/CLS against the budgets in `docs/PERFORMANCE.md`.

## 10. Key assumptions made (flagged, revisit if wrong)

1. Single Next.js App Router app (frontend + backend colocated) — decided
   with the user; see `docs/ARCHITECTURE.md` §Decision log.
2. Payment: Stripe, test mode first, config-driven for future gateway swap.
3. Email: Gmail SMTP for now (free tier, ~500/day), explicitly a short-term
   choice the user plans to revisit weekly; code sits behind an
   `EmailProvider` interface so swapping to SES/Brevo/Resend is a config
   change only.
4. Database: Postgres, Supabase-only (not its Auth/Storage) is the intended
   target, but **local Docker Postgres is what's actually running for dev**
   as of Phase 2 — no Supabase project existed yet when that phase started,
   so the user chose local Docker to keep moving; switching later is just a
   `DATABASE_URL` change. Redis (local Docker too, Phase 2) and the app/
   worker hosts are still unchosen (Vercel + a small worker host is the
   working assumption) — revisit before Phase 14.
5. No existing code/design system to preserve — repo was an empty scaffold
   (`package.json`, placeholder `index.js`) at the time of this PRD.
6. Auth is passwordless (confirmed) — OTP/magic-link only, no password field
   anywhere in the product (`docs/ARCHITECTURE.md` §6).
