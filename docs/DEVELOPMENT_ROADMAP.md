# Development Roadmap

Status: Draft v1 — foundation phase. Phases follow Part 16 §Step 4 order.
Each phase is independently testable and ends with a working, demoable
slice — never "UI only" or "mock implementation" (Part 16, Part 17).

Current state: **Phase 11 complete.** Phase 12 has not started.

## Phase 1 — Project foundation & design system — ✅ complete

- **Files**: `package.json` (Next.js 16, React 19, TypeScript, Tailwind v4,
  ESLint 9 flat config, Vitest, Playwright — Prisma deliberately **not**
  installed yet; it has nothing to do until Phase 2 defines a schema, so it
  was dropped from this phase's actual dependency list), `app/layout.tsx`,
  `app/page.tsx`, `app/not-found.tsx`, `app/globals.css` (placeholder design
  tokens), `components/ui/{Button,Card,Input,ProgressBar,index}.tsx`.
- **DB**: none yet (as planned).
- **API**: none yet (as planned).
- **Frontend**: root layout, homepage shell demoing the design system,
  custom 404 page, placeholder design tokens (brand color scale + font,
  swappable in one place per `docs/PRD.md`'s undecided-branding constraint).
- **Tests**: 7 Vitest + React Testing Library smoke tests across all 4 `ui/*`
  primitives (`tests/unit/*.test.tsx`); 2 Playwright e2e tests
  (`tests/e2e/homepage.spec.ts`) covering the homepage shell and the custom
  404 page end-to-end against a real built-and-started server.
- **Acceptance**: `npm run build`, `npm run typecheck`, `npm run lint`,
  `npm run test` (7/7 passed), and `npm run test:e2e` (2/2 passed) all pass.
  Verified 2026-11-18.

## Phase 2 — Database & authentication — ✅ complete

- **Infra**: `docker-compose.yml` — local Postgres (port 5433) and Redis
  (port 6380) for dev, since no Supabase project exists yet (see
  `docs/ARCHITECTURE.md` §1). Redis was pulled into this phase specifically
  (not deferred to Phase 7/10 as originally sketched) because rate limiting
  on auth endpoints is a Part 13 hard requirement, not optional polish.
- **Files**: `prisma/schema.prisma` (all 24 tables + enums per
  `docs/DATABASE.md`, plus a hand-written follow-up migration adding the
  self-referral `CHECK` constraint Prisma's schema language can't express),
  `prisma/seed.ts`, `lib/db/client.ts`, `lib/auth/{errors,crypto,free-tier,
  referral,verification,registration,login,session,cookies,schemas}.ts`,
  `lib/email/{provider,console-provider,gmail-smtp-provider,index,
  templates}.ts`, `lib/rate-limit/index.ts`, `lib/http/get-client-ip.ts`,
  `app/api/auth/{register,login,verify-otp,verify-magic-link,logout,
  session}/route.ts`, `app/(auth)/{register,login,verify}/*`,
  `app/dashboard/*` (a minimal authenticated landing page — not in the
  original file list, added because "land in a logged-in state" needs
  somewhere to land; the full app shell is still Phase 5+).
- **DB**: all 24 tables migrated against local Postgres; seed script
  populates `system_settings` (`free_tier_allocation` = `{count:0,cap:10}`,
  `reminder_interval_days` = 7, `reminder_max_count` = 10,
  `referral_qualification_threshold` = 2) and one active
  `AssessmentTemplate` (20 min, 10/10/10, v1 scoring weights).
- **API**: `register`, **`login`** (added — the original API.md draft
  omitted it, but the spec requires both register *and* log in), `verify-otp`,
  `verify-magic-link`, `logout`, `session`. All documented in `docs/API.md`.
- **Frontend**: `/register`, `/login`, `/verify` (all noindex), plus a
  minimal `/dashboard`.
- **Tests**: 11 new integration tests across registration/verification
  (wrong code, reused code, expired code, sibling invalidation, duplicate
  registration, referral attribution, invalid referral code, self-referral
  guard at both the app and DB level), 4 session tests (issue/verify/revoke/
  expire), 2 rate-limit tests, and **the free-tier concurrency test** — 30
  concurrent callers against a cap of 10, asserting exactly 10 succeed with
  no duplicate ranks (`docs/DATABASE.md` §3). 28/28 unit+integration tests
  passing; found and fixed a real test-isolation bug where parallel test
  files sharing one Postgres instance clobbered each other's rows
  (`vitest.config.ts` → `fileParallelism: false`).
- **Acceptance**: verified against the real running app (not just tests) —
  registered a user via curl, read the OTP from the console email log,
  verified it, confirmed the session and `/dashboard` both reflect
  `isFreeTierEligible: true, freeTierRank: 1`, logged out and confirmed the
  session was revoked (401 after). Separately verified the magic-link path
  end-to-end and confirmed a reused OTP is rejected. `npm run build`,
  `typecheck`, `lint`, `test` (28/28), `test:e2e` (2/2) all pass. Verified
  2026-11-18.
- **Resolved decision**: passwordless-only auth was confirmed before this
  phase started (`docs/ARCHITECTURE.md` §6).
- **Carried forward, not blocking**: Supabase project still doesn't exist;
  dev runs on local Docker Postgres/Redis. Switching later is a
  `DATABASE_URL`/`REDIS_URL` change only.
- **Post-Phase-11 addition (2026-11-20): social login.** The user asked
  for Google and LinkedIn sign-in, added alongside (not replacing) email
  OTP/magic-link — this explicitly reverses `docs/PRD.md` §7's "no social
  login" non-goal (recorded there, not silently dropped) and extends
  Phase 2's auth decision log rather than reopening Phase 2 itself, since
  every existing email-path guarantee (free-tier allocation, referral
  attribution, session issuance) is reused as-is, not rebuilt.
  **Files**: `lib/auth/oauth/{config,providers,account,provider-param}.ts`,
  `app/api/auth/oauth/[provider]/{start,callback}/route.ts`,
  `app/(auth)/OAuthButtons.tsx` (wired into both `RegisterForm.tsx` and
  `LoginForm.tsx` — same find-or-create action either way). **New
  dependency**: `arctic` (OAuth2/PKCE client; deliberately not NextAuth/
  Supabase Auth — same reasoning as Phase 2's original auth decision,
  see `docs/ARCHITECTURE.md`). **DB**: migration `add_oauth_accounts` —
  new `OAuthAccount` table + `OAuthProvider` enum, `User` unchanged
  (`docs/DATABASE.md`). **API**: `docs/API.md` §1/§1.1. The provider's
  attested email counts as verified immediately — for a brand-new OAuth
  signup or for linking to an existing still-unverified email account,
  that moment runs the exact same `allocateFreeTierSlot`/
  `attributeReferral` transaction the email path uses, reused directly
  rather than re-derived; linking to an already-verified account never
  re-allocates or re-attributes. **Tests**: 6 new integration tests
  (`tests/integration/oauth.test.ts`) — brand-new signup allocation,
  idempotent repeat login (no duplicate `OAuthAccount`, no double
  allocation), linking to an unverified vs. already-verified existing
  user, referral attribution matching the email path, and a genuine
  concurrency race (`Promise.all` of two identical callbacks) that
  surfaced a real bug while writing the test — see below. 194/194 total
  unit+integration tests passing.
- **Bug caught and fixed while writing that test**: the first cut of
  `findOrCreateOAuthUser` had no race handling at all. Two concurrent
  calls for the *same* provider account both pass the "does this already
  exist" check before either commits, then race on `User.email`'s unique
  constraint (or `OAuthAccount`'s) — the loser threw a raw `P2002`
  instead of returning the winner's user. Fixed with the same
  catch-`P2002`-and-re-fetch pattern already used by
  `lib/referrals/code.ts` and `lib/sharing/certificate.ts`, verified by
  the `Promise.all` test actually failing first, then passing after the
  fix — not reasoned about in the abstract.

## Phase 3 — Landing page & SEO foundation — ✅ complete

- **Files**: `app/(public)/{layout,page}.tsx`, `app/(public)/{how-it-works,
  pricing,faq}/page.tsx`, `lib/seo/{constants,metadata,json-ld,
  public-pages}.ts`, `app/sitemap.ts`, `app/robots.ts`,
  `components/seo/JsonLd.tsx`, `components/ui/Breadcrumbs.tsx`,
  `components/layout/{PublicHeader,PublicFooter}.tsx`. Root `app/layout.tsx`
  gained `metadataBase` and a title template (`%s | <APP_NAME>`). The old
  placeholder `app/page.tsx` (design-system preview) was replaced by the
  real homepage at `app/(public)/page.tsx`.
- **DB**: none new, as planned.
- **API**: none new, as planned.
- **Frontend**: `/`, `/how-it-works`, `/pricing`, `/faq` — real original
  copy (hero + value props, 5-step walkthrough, two-unlock-path pricing
  explanation, 7-question FAQ), each with unique title/description/
  canonical, Organization/WebSite/WebPage/BreadcrumbList JSON-LD, and
  visible breadcrumbs. **Category landing pages
  (`/free-iq-test`, `/logical-reasoning-test`, etc.) were deliberately
  deferred to Phase 11** per this phase's own "can land here or in Phase
  11" clause — building them now without the question bank (Phase 4) to
  link a real sample question from would mean thin content, which the spec
  explicitly prohibits.
- **Tests**: 9 new unit tests (metadata uniqueness across all 4 public
  pages, canonical URL uniqueness, `robots:index:false` on every private
  page, sitemap inclusion/exclusion, robots.txt disallow list) + 2 new
  Playwright e2e tests (public pages reachable, sitemap/robots.txt served
  correctly) on top of Phase 1/2's suite. 37/37 unit+integration, 4/4 e2e.
- **Acceptance**: Lighthouse against the homepage (local `next start`,
  unthrottled) scored Performance 100 / SEO 100 / Accessibility 100 — LCP
  756ms, CLS 0, well under `docs/PERFORMANCE.md` budgets. JS transfer was
  151.4 KB, right at the 150 KB budget line (see `docs/PERFORMANCE.md` for
  the full note — it's framework baseline, not app code, but worth
  watching). Sitemap/robots verified to include exactly the public pages
  and exclude every route in `docs/SEO_STRATEGY.md` §2's noindex list.
  Verified 2026-11-18.
- **Process note**: caught a stale `next start` process left running from
  Phase 2's manual smoke test that was silently serving old content to the
  Playwright e2e suite (`reuseExistingServer` picked it up instead of
  starting fresh) — the "passing" test was asserting against the wrong
  build. Killed it, fixed the test to assert the real new homepage copy,
  reran against a genuinely fresh server. Worth remembering: always check
  `lsof -i :3000` (or the relevant port) before trusting a Playwright run
  that reuses an existing server.

## Phase 4 — Question bank & admin management (core) — ✅ complete

- **Files**: `lib/auth/guards.ts` (RBAC — `getCurrentUser`/`assertAdmin`,
  the latter a pure function so it's unit-testable without a request
  context), `lib/admin/{schemas,questions}.ts`, `lib/assessment/serialize.ts`,
  `lib/http/admin-response.ts`, `app/api/admin/questions/{route,[id]/route,
  [id]/publish/route,bulk-import/route}.ts`, `app/admin/{layout,
  questions/{page,QuestionForm,new/page,[id]/{page,QuestionActions},
  bulk-import/{page,BulkImportForm}}}.tsx`, `scripts/promote-admin.ts`
  (there's no public admin signup path, per `docs/PRD.md` §4 — this script
  is the only way to create one, and requires direct DB access).
- **DB**: question CRUD against the existing schema (no migration needed —
  tables existed since Phase 2). Seeded all 10 categories from requirement.txt
  Part 3 and a bank of **90 original questions** (9 per category: 3 each
  at EASY/MEDIUM/HARD, 30/30/30 overall), authored fresh for this project,
  routed through the same `bulkImportQuestions` validation path the admin UI
  uses — not a separate, divergent seeding mechanism. Started at 30 (1 per
  category per difficulty); expanded to 90 during Phase 5 once real usage
  revealed that 1-per-category-per-difficulty gave the template's 10-per-
  difficulty draw literally nothing to vary — every attempt and every
  retake selected the exact same 30 questions, just reshuffled (see Phase
  5 notes below). Ramping toward the 300-question target continues in
  later content work.
- **API**: admin question list/create/get/edit/archive, publish, bulk
  import — see `docs/API.md` §7 for the updated, accurate route table.
- **Frontend**: `/admin/questions` list, new/edit forms, bulk-import page —
  all role-gated, noindex. Unauthenticated visitors are redirected to
  `/login`; authenticated non-admins see an inline "403 — Forbidden" page
  rather than a redirect, so the two failure modes stay visibly distinct.
- **Tests**: 16 new tests — 3 unit tests proving `serializePublicQuestion`
  never leaks `isCorrect`/`explanation`/`scoringWeight`/etc. even when
  present on the input (whitelist, not blacklist, so a future field
  addition can't silently leak), 3 unit tests for `assertAdmin`'s three
  outcomes, and 10 integration tests covering the full question lifecycle
  (create → publish → edit-bumps-version → archive → archived-is-immutable)
  plus bulk-import's per-row error isolation. 53/53 unit+integration tests
  passing.
- **Acceptance**: verified against the real running app, not just tests —
  registered a user, confirmed the admin API returns 401 unauthenticated
  and 403 for that user while still a plain `USER`, ran
  `npm run admin:promote -- <email>` and confirmed the *same* session
  immediately got 200 access (no re-login needed, since role is read fresh
  from the DB on every request — never cached in the session token).
  Created → published → edited (version 1→2, confirmed) → archived a
  question via curl, confirmed archived questions reject further edits,
  ran a bulk import with 2 valid + 1 invalid row and confirmed exactly 1
  error reported without losing the 2 valid creates. Confirmed the admin UI
  itself shows the redirect-to-login vs. inline-403 distinction correctly
  for unauthenticated vs. non-admin visitors. `npm run build`, `typecheck`,
  `lint`, `test` (53/53), `test:e2e` (4/4) all pass. Verified 2026-11-18.
- **Post-Phase-11 addition (2026-11-20): retuned difficulty-based question
  timing.** User-directed: EASY/MEDIUM/HARD `expectedSolvingTimeSeconds`
  changed from 30/60/90s to 15/35/70s. While making this change, found
  `TIME_BY_DIFFICULTY`/`WEIGHT_BY_DIFFICULTY` independently duplicated,
  identically, in both `prisma/seed-questions.ts` and
  `prisma/seed-stimulus-recall-pairs.ts` — consolidated into a single
  `prisma/question-timing.ts` (the latter file now re-exports from it, so
  `prisma/seed.ts` and `tests/integration/helpers/assessment-fixtures.ts`
  needed no import changes) specifically so the two copies can't drift
  apart again next time this needs to change, which is exactly the
  failure mode that would otherwise be easy to hit silently. Existing
  seeded questions in both the dev and test databases were updated
  directly (matched by old per-difficulty value, `STIMULUS` screens
  excluded — their fixed 15s "memorize this" display isn't governed by
  this scheme) rather than left stale until a future reseed. Verified via
  the real running app's own `/api/assessment/[attemptId]/state`
  response, not inference from the UI — a HARD question read back
  `expectedSolvingTimeSeconds: 70`, an EASY one `15`. `npm run build`,
  `typecheck`, `lint`, `test` (194/194), `test:e2e` (9/9) all pass.

## Phase 5 — Assessment engine — ✅ complete

- **Files**: `lib/assessment/{errors,shuffle,select,start,state,answer,
  submit,serialize}.ts`, `lib/auth/guards.ts` gained `assertAuthenticated`,
  `lib/http/assessment-response.ts`, `app/api/assessment/{start/route,
  [attemptId]/{state,answer,submit}/route}.ts`,
  `app/assessment/[attemptId]/page.tsx`,
  `components/assessment/{Countdown,QuestionNavigator,QuizRunner}.tsx`,
  `app/dashboard/StartAssessmentButton.tsx` (dashboard now shows "Resume
  assessment" or "Start assessment" depending on whether the user already
  has one `IN_PROGRESS`). Authenticated pages live flat under `app/`, not
  in an `(app)` route group as the architecture doc originally sketched —
  see `docs/ARCHITECTURE.md`'s module map note.
- **DB**: `assessments`/`assessment_questions`/`assessment_answers` writes
  against the existing schema — no migration needed.
- **API**: start (resume-or-create), state, answer, submit — see
  `docs/API.md` §2 for the exact, now-accurate behavior of each.
- **Frontend**: full quiz runner — server-authoritative countdown isolated
  in its own component so only it re-renders every second
  (`docs/PERFORMANCE.md` §5), progress bar, difficulty badge, question
  navigator grid (answered/marked/unanswered states), mark-for-review,
  Previous/Next + ArrowLeft/ArrowRight keyboard navigation, retry-with-
  backoff on answer saves for transient network failures.
- **Key design decision — lazy auto-finalization, not a cron job**: rather
  than building BullMQ worker infrastructure this phase just to satisfy
  "automatically submit when time expires," every state/answer/submit/start
  call checks first whether the attempt is `IN_PROGRESS` past `expires_at`
  and finalizes it to `EXPIRED` before doing anything else. This is
  correct and sufficient for every user-facing case (the user's own next
  interaction resolves it); the one gap — a session nobody ever looks at
  again staying `IN_PROGRESS` forever — is a data-hygiene issue, not a
  correctness one, and is tracked in `docs/ARCHITECTURE.md` §4.4 for
  whenever real worker infrastructure gets built.
- **Other flagged assumption**: retakes are currently unrestricted — a new
  attempt can start immediately after a previous one is `SUBMITTED`/
  `EXPIRED`. Spec Part 9 mentions admin-configurable "retake rules," but
  that's an admin-management feature not yet built; this phase just didn't
  add an artificial restriction ahead of that feature existing.
- **Tests**: 18 new tests — question selection (exact per-difficulty
  counts, zero duplicate questions, full category coverage given the
  current seed shape, randomized ordering across calls, clear error when
  the bank can't satisfy the template), the full happy-path flow (start →
  answer → resume-returns-same-attempt → submit → idempotent resubmit →
  post-submit answers rejected → retake starts a new attempt), the
  server-authoritative timer (answer rejected past deadline *and*
  auto-finalizes it, state reports `EXPIRED` on first look, an explicit
  user submit racing the deadline stays `EXPIRED` not `SUBMITTED`,
  refreshing never changes `expiresAt`), ownership (403 `forbidden` for a
  non-owner on state/answer/submit, 404 for a nonexistent attempt), and the
  `shuffle` utility. 71/71 unit+integration tests, 4/4 e2e passing.
- **Acceptance**: verified against the real running app — registered and
  verified a user, started an assessment (30 questions, real server
  `expiresAt`), answered a question, called `/start` again and confirmed
  the *identical* `attemptId` came back (true resume, not a duplicate),
  confirmed the answer survived that "refresh," submitted, confirmed a
  second submit was a no-op, confirmed answering after submit returned 409
  `expired`, confirmed starting again afterward created a genuinely new
  attempt (retake). Separately forced an attempt's `expiresAt` into the
  past directly in Postgres and confirmed the very next `state` call
  flipped it to `EXPIRED` in the database with `submittedAt` set — proving
  the lazy-finalization mechanism works without any job running — and
  confirmed the quiz page itself renders the right post-expiry
  confirmation message. `npm run build`, `typecheck`, `lint`, `test`
  (71/71), `test:e2e` (4/4) all pass. Verified 2026-11-18.
- **Post-completion fix (2026-11-18, same day)**: the user caught that
  retakes weren't actually random — with only 30 published questions and
  a template needing exactly 10 per difficulty, `selectQuestions` always
  returned *all* available questions per difficulty, every time; only
  question/option *order* varied, never which questions appeared. Fixed
  two things together: expanded the bank to 90 questions (see DB note
  above), and rewrote `selectQuestions` to do a **stratified draw** — for
  each difficulty, exactly 1 random question per category (deterministic
  balance, matching spec Part 3's "maintain balanced category
  distribution") rather than a single random draw across the whole
  difficulty pool (which, once the bank was bigger, could have produced
  an unbalanced attempt — 0 questions from one category, 2 from another).
  Falls back to a plain random draw if a future admin config doesn't
  divide evenly across categories. Verified directly against the dev DB:
  5 concurrent selection runs all produced exactly 10 categories × 3 each,
  but did not all pick the identical 30 question ids. Added a dedicated
  regression test (`assessment-selection.test.ts`) asserting repeated
  calls don't all converge on the same question set. 72/72 tests passing
  after the fix.
- **Post-completion feature (2026-11-18, same day): delayed-recall memory
  questions.** The user pointed out the memory/attention questions
  weren't testing real memory — they showed a number and asked about it
  in the same breath, so the number was always visible while answering.
  Real delayed recall needs the stimulus shown once, then asked about
  later, without being re-shown. Added: `QuestionKind` enum (`STANDARD`/
  `STIMULUS`/`RECALL`) + `stimulusQuestionId` self-relation on `Question`
  (migration `20261118205600_add_question_kind_stimulus_recall`);
  `selectQuestions` excludes `STIMULUS` from the normal draw pool and
  instead splices a drawn `RECALL`'s stimulus in at least `MIN_STIMULUS_GAP`
  (3) questions earlier; the quiz runner renders `STIMULUS` as a distinct
  "memorize this" screen with no options and excludes it from the
  progress-bar denominator; the answer endpoint rejects selecting an
  option on a `STIMULUS`; admin create/update validates `RECALL`'s
  `stimulusQuestionId` references a real, unlinked `STIMULUS`, blocks
  publishing a `RECALL` before its stimulus is published, and cascades
  archiving a `STIMULUS` to its `RECALL`. Seeded 3 real pairs (one per
  difficulty; the HARD one matches the user's own example — a 7-digit
  number, asked "what was the third digit?" several questions later).
  `docs/SCORING.md` updated: STIMULUS questions must be excluded from
  every scoring tally once Phase 6 is built — flagged now so it isn't
  forgotten later. 9 new tests (lifecycle validation, forced-inclusion
  pairing/ordering/gap, answer rejection); 81/81 total passing. Verified
  against the real running app: forced the HARD pair to be the sole
  memory-attention/HARD candidate, started an attempt, confirmed the
  stimulus appeared at position 7 and its recall at position 11 (gap of
  4), answered the recall correctly, confirmed persistence, and confirmed
  the quiz page renders the stimulus screen distinctly.
- **Post-Phase-11 addition (2026-11-20): quiz UI redesign.** User-directed
  change to the taking-the-assessment experience, not a spec requirement
  — removed the overall countdown display and the "Question X of Y"
  label/numbered navigator grid, replaced with a per-question pacing bar
  (`components/assessment/QuestionTimerBar.tsx`, draining over that
  question's own `expectedSolvingTimeSeconds`, remounted fresh per
  question via `key={assessmentQuestionId}`) and a gamification strip
  (`components/gamification/QuizGamificationStrip.tsx`: live XP total +
  an "answered in a row" streak). **Non-negotiable rule preserved**
  (CLAUDE.md #1, `docs/ARCHITECTURE.md` §4.4): the real deadline
  enforcement is completely unchanged — still the single server-side
  `expires_at` for the whole assessment, still lazily auto-finalized on
  the next request past it either way. The per-question bar is explicitly
  cosmetic pacing, never a cutoff; nothing is locked or auto-submitted
  when it hits zero. The old visible `Countdown` watched `expiresAt` with
  per-second React state just to render digits; the new watcher does the
  same expiry check with **zero state updates per tick** (nothing to
  display, nothing to re-render) — strictly cheaper, not just different
  (`docs/PERFORMANCE.md` §3 updated). `expectedSolvingTimeSeconds` (
  already captured per-question by the admin panel since Phase 4, never
  previously exposed to the live attempt) was added to
  `serializeAssessmentQuestion`'s whitelist (`lib/assessment/serialize.ts`)
  — still a question-authoring field, never anything scoring-related, so
  this doesn't touch the `docs/API.md` §8 "must never expose" list. Old
  `Countdown.tsx`/`QuestionNavigator.tsx` deleted (no remaining callers).
  **Bug caught while verifying against the real app**: the first cut of
  the "answered streak" counted backward from the *current* question and
  broke immediately if it wasn't answered yet — which is the normal state
  right after clicking Next, so the streak reset to 0 on every single
  navigation instead of reflecting what was actually just answered.
  Fixed to count the current question only if answered, then continue
  counting backward through *previous* questions regardless. Verified via
  Playwright against the real running app (curl is the wrong tool for
  this page — `useSearchParams`-driven Suspense content only resolves in
  an actual browser, same lesson as the OAuth verification above): no
  "Question X of Y" text, no navigator grid, a real per-question bar that
  measurably drains and resets on `Next`, and the streak correctly
  showing "1 in a row" after answering a question and moving to the next.
  `npm run build`, `typecheck`, `lint`, `test` (194/194), `test:e2e`
  (9/9) all pass.
- **Post-Phase-11 follow-up (2026-11-20, same day): quiz UI iteration.**
  Further user-directed refinement of the redesign above: dropped the
  difficulty label entirely; replaced it with live `Answered: N ·
  Unanswered: N` counts (`scorableQuestions`, excluding `STIMULUS`, same
  denominator the old overall progress bar used); the per-question timer
  now actually advances the quiz on expiry (`QuestionTimerBar` gained an
  `onExpire` callback, wired to the same `goNext` the Next/Continue
  buttons call) instead of just sitting at zero; **navigation is now
  strictly forward-only** — the Previous button and the ArrowLeft
  keyboard handler are both gone, there is no path back to an earlier
  question once you've left it; `Submit assessment` is disabled until
  `currentIndex` reaches the last question. None of this touches the
  real enforcement boundary — the server-side `expiresAt` deadline and
  the answer endpoint's ownership/status checks are completely
  unchanged, so a user technically *could* still reach an earlier
  question's answer via a direct API call; the UI just no longer offers
  a path to do it, consistent with this feature always having been
  client-side pacing, never a new server-enforced rule.
  **Bug fixed, caught before it shipped**: the timer bar's first redesign
  used `setInterval(tick, 250)` together with a CSS `transition-all` —
  the fixed-tick jump fighting the CSS transition's own catch-up
  animation produced a visible stutter ("jittery"). Rewritten to drive
  the width from `requestAnimationFrame` every frame with no CSS
  transition at all, so there's nothing for a transition to race against.
  **Verified against the real running app**: confirmed no EASY/MEDIUM/
  HARD text, no Previous button (including after pressing ArrowLeft),
  `Answered`/`Unanswered` counts present, `Submit` disabled on question 1;
  directly shortened one question's `expectedSolvingTimeSeconds` to 2s in
  the dev DB and confirmed the quiz **auto-advanced to question 2 with
  zero clicks** (question text changed); clicked `Next` through to the
  actual last question and confirmed `Submit` became enabled exactly
  there, not before. `npm run build`, `typecheck`, `lint`, `test`
  (194/194), `test:e2e` (9/9) all pass.

## Phase 6 — Scoring & result management — ✅ complete

- **Files**: `lib/scoring/{types,v1,bands}.ts`, `lib/results/{create-result,
  access}.ts`, `app/api/results/[attemptId]/route.ts`,
  `app/results/[attemptId]/page.tsx`, `components/results/{LockedResult,
  FullResult}.tsx`. `lib/assessment/submit.ts` updated so
  `finalizeAssessment` calls `ensureAssessmentResult` right after the
  status transition commits. `lib/http/assessment-response.ts` gained a
  `not_submitted` → 409 mapping. Authenticated results pages live flat
  under `app/results/`, not an `(app)` group — same precedent as Phase 5's
  `app/assessment/`.
- **DB**: `assessment_results` writes (idempotent create, unique on
  `assessmentId`), `result_access_state` set to `FREE_ACCESS`/`LOCKED` at
  creation based on `users.isFreeTierEligible`, transitioned to
  `RESULT_VIEWED` on first unlocked view.
- **API**: `GET /api/results/[attemptId]` — locked vs. unlocked payloads,
  ownership-checked, `not_submitted` for an in-progress attempt. See
  `docs/API.md` §3 for the exact field lists.
- **Frontend**: locked-result screen (Part 6's exact copy: "Your
  assessment is complete. Your results are waiting!", completion
  confirmation, questions attempted, time taken, both unlock CTAs shown
  but disabled with "coming in a later phase" microcopy since Phase 7/8
  don't exist yet — not faked as working) and the full report (score
  reveal, performance label, accuracy, completion time, correct/
  incorrect/unanswered, difficulty and category breakdowns with category
  names resolved, not raw UUIDs). `QuizRunner`'s post-submit card now
  links to `/results/[attemptId]`; the dashboard shows "View my last
  results" when the user has a completed attempt.
- **Explicitly deferred, not stubbed**: XP earned and referral progress
  are part of Part 6's locked-screen spec but aren't included in the
  payload yet — those fields are added when Phase 7 (referrals) and
  Phase 10 (gamification) actually build the systems behind them, rather
  than shipping fake zeros now.
- **Tests**: 7 scoring unit tests (table-driven: all-correct, all-
  incorrect, all-unanswered, mixed breakdowns, zero-questions edge case,
  STIMULUS exclusion even when marked correct, determinism), 5 result-
  creation integration tests (FREE_ACCESS vs LOCKED assignment,
  idempotency, EXPIRED scored against the deadline not the discovery
  time, stimulus exclusion end-to-end), 6 result-access integration tests
  including the critical one — a LOCKED result's JSON contains zero
  score-related field names, checked by substring search over the full
  serialized response, not just "the locked branch doesn't set them."
  99/99 total tests, 4/4 e2e passing.
- **Acceptance**: verified against the real running app, not just
  tests — registered the first verified user (free-tier rank 1), answered
  all 30 scored questions correctly using answers read directly from
  Postgres (the one place in this whole exercise it's legitimate to read
  `is_correct` outside the app itself), submitted, and confirmed the API
  returned the full unlocked report with a perfect score and
  "Exceptional" label, auto-transitioning to `RESULT_VIEWED`. Separately
  exhausted the free-tier cap, registered a user who is genuinely not
  free-tier eligible, submitted an unanswered attempt, and confirmed the
  API response was `{status: "locked", resultAccessState: "LOCKED",
  questionsAttempted: 0, completionTimeSeconds: 0}` — then grepped the raw
  response bytes for every score-related field name and found none,
  and confirmed the results page itself renders the required locked-
  screen copy. `npm run build`, `typecheck`, `lint`, `test` (99/99),
  `test:e2e` (4/4) all pass. Verified 2026-11-19.

## Phase 7 — Referral system — ✅ complete

- **Files**: `lib/referrals/{errors,code,progress,qualification,unlock,
  admin}.ts`, `lib/config/system-settings.ts` (new shared module — typed
  access to `{value: T}`-shaped settings rows, reusable by Phase 9
  reminders later), `lib/http/referral-response.ts`,
  `app/api/referrals/{code,progress}/route.ts`,
  `app/api/admin/referrals/{route,[id]/disqualify/route}.ts`,
  `app/r/[code]/page.tsx`, `app/admin/referrals/{page,
  DisqualifyButton}.tsx`, `components/results/ShareReferralLink.tsx`.
  `lib/auth/registration.ts` and the register route gained
  `registrationIp` threading for the anti-abuse heuristic. **No
  `workers/qualification.worker.ts`** — qualification runs synchronously
  inside `finalizeAssessment`, the same "synchronous now, job later"
  pattern Phase 5 used for assessment auto-expiry; no BullMQ/worker
  infrastructure exists yet to justify building a queue just for this.
- **DB**: migration `20261119053000_referral_anti_abuse_fields` — added
  `User.registrationIp` and `ReferralQualification.flaggedSuspicious` (not
  originally planned; added once the IP anti-abuse heuristic needed
  somewhere to read/write from). `referral_codes`/`referrals`/
  `referral_qualifications` writes using the schema/constraints already in
  place since Phase 2. `AssessmentResult.resultAccessState` can now reach
  `UNLOCKED_BY_REFERRAL` (set either by `tryUnlockViaReferral` after a
  qualification, or directly at result-creation time if the referrer
  already qualified before taking their own assessment).
- **API**: referral code (idempotent get-or-create), progress (read-only
  projection, never stored), admin referral list + disqualify (audited).
  See `docs/API.md` §4 for the exact behavior.
- **Frontend**: the locked-result screen now shows real referral progress
  (`X of Y qualified`) and a working copy-to-clipboard referral link —
  replacing last phase's disabled placeholder button, since this phase
  actually built the system behind it. The $1 payment button stays
  disabled (Phase 8 still doesn't exist). Admin referral dashboard lists
  referrer/referred/status/flag with a disqualify action.
- **Design correction during this phase**: the original
  `docs/REFERRAL_RULES.md` draft had an automatic `PENDING →
  DISQUALIFIED` transition for "anti-abuse check fails." Once the v1
  anti-abuse checks were pinned down concretely, none of them can
  actually fail at qualification time — self-referral and duplicate
  attribution are already blocked at `referrals` creation, and the IP
  heuristic deliberately only flags. So that automatic path was removed
  from the state machine doc; disqualification is admin-only in practice.
  Caught and fixed while implementing, not left inconsistent.
- **Tests**: 11 new integration tests covering the full state machine —
  real registration-flow attribution, qualification requires verified
  *and* `SUBMITTED` (an `EXPIRED`-only referred user never qualifies),
  the same-IP heuristic flags without blocking, the acceptance criterion
  itself end-to-end (referrer LOCKED → friend 1 qualifies, still LOCKED →
  friend 2 qualifies, automatically `UNLOCKED_BY_REFERRAL`), the
  "already qualified before taking their own assessment" path, idempotent
  unlock under concurrent duplicate calls, and admin disqualify being
  audited while never revoking an existing unlock. 110/110 total tests,
  4/4 e2e passing.
- **Acceptance**: verified against the real running app, not just
  tests — registered a referrer, got their real code, had them complete
  their own (unanswered) assessment to land `LOCKED`. Visited `/r/[code]`
  and confirmed the redirect to `/register?ref=[code]`. Registered friend
  1 through that link, completed their assessment, confirmed progress
  `1/2` and the referrer still `LOCKED`. Registered friend 2 the same way,
  completed their assessment, and confirmed the referrer's result flipped
  to unlocked **automatically, with zero manual steps** — the literal
  acceptance criterion. Also confirmed the admin referral dashboard
  renders real data, including the same-IP flag firing correctly (all
  three accounts were registered from the same curl client, so the
  heuristic correctly flagged them — not a test artifact). `npm run
  build`, `typecheck`, `lint`, `test` (110/110), `test:e2e` (4/4) all
  pass. Verified 2026-11-19.

## Phase 8 — Payment integration — ✅ complete (pending a real Stripe account for live-mode payments)

- **Files**: `lib/payments/{errors,provider,stripe-provider,index,
  create-intent,webhook,admin,stripe-client}.ts`,
  `lib/http/payment-response.ts`,
  `app/api/unlock/payment/create-intent/route.ts`,
  `app/api/payments/webhook/stripe/route.ts`,
  `app/api/admin/payments/route.ts`, `app/admin/payments/page.tsx`,
  `components/results/UnlockWithPayment.tsx` (Stripe Elements checkout,
  wired into `components/results/LockedResult.tsx` in place of last
  phase's disabled placeholder button). `package.json` gained `stripe`,
  `@stripe/stripe-js`, `@stripe/react-stripe-js`.
- **No Stripe account yet**: user confirmed they don't have one. Built the
  full `PaymentProvider` abstraction and real `StripePaymentProvider`
  regardless — `createPaymentIntent` (the only piece that needs a real
  `STRIPE_SECRET_KEY` to call Stripe's API) fails fast with a clean
  `503 provider_not_configured` and writes nothing to the DB, rather than
  crashing or faking success. `constructWebhookEvent` (signature
  verification) only needs `STRIPE_WEBHOOK_SECRET`, which is pure local
  HMAC crypto with no network call — so the entire
  webhook/idempotency/unlock pipeline was built and verified for real
  against a dev-only placeholder secret, with zero mocking. Swapping in a
  real Stripe account later is a `.env` change only, no code change.
- **DB**: no new migration — `Payment` already existed in full since
  Phase 2's initial schema. `payments` rows now actually get written
  (`PENDING` → `SUCCEEDED`/`FAILED`/`REFUNDED`, `webhookEventId` recorded
  as an audit trail alongside each status flip) and `result_unlocks`
  writes with `unlockMethod: PAYMENT`.
- **API**: create-intent (ownership + not-submitted + already-unlocked
  guards, client-generated idempotency key, moves `result_access_state` to
  `PAYMENT_PENDING`, rate-limited 10/hour/IP + 10/hour/user), webhook (no
  auth — Stripe calls it directly; signature-verified against the raw
  body first), admin payment list + revenue summary. See `docs/API.md` §4
  and §7 for exact behavior.
- **Idempotency design**: mirrors Phase 7's `tryUnlockViaReferral` exactly
  — a cheap `payment.status` check up front (handles a redelivered
  webhook, the common case) plus the `ResultUnlock.assessmentResultId`
  unique constraint as the actual concurrency-safe backstop (handles two
  deliveries racing in at once). Verified under real `Promise.all`
  concurrency in tests, not just reasoned about.
- **Refund decision (new, documented assumption)**: `charge.refunded`
  marks the payment `REFUNDED` for audit/admin visibility but does **not**
  re-lock an already-unlocked result — same precedent as Phase 7's
  referral disqualification never revoking an existing unlock. Flagged
  here for the user to confirm once real refunds are possible.
- **Frontend**: the $1 card payment on the locked-result screen is now
  live — `UnlockWithPayment` creates the PaymentIntent, mounts Stripe's
  `PaymentElement`, confirms with `redirect: "if_required"`, then polls
  `/api/results/[attemptId]` until the webhook has actually unlocked it
  (the frontend never marks anything unlocked itself). In dev (no Stripe
  key configured) it surfaces a clean "Card payments aren't available
  yet — use the free invite-friends unlock instead" message rather than
  erroring. Admin `/admin/payments` shows transactions and a revenue
  summary (net revenue, refunded, failed counts).
- **Tests**: 19 new integration tests — ownership/not-submitted/
  already-unlocked guards on create-intent, idempotent resubmission of
  the same client idempotency key (no duplicate payment row), idempotency
  key reuse across a different assessment rejected, a frontend "success"
  redirect alone never unlocking anything, `createPaymentIntent` failing
  cleanly with `provider_not_configured` when unconfigured, webhook
  signature verification (valid / tampered / wrong-secret, using Stripe's
  own offline `generateTestHeaderString` test-signing utility — real HMAC
  verification, no mocking), `payment_intent.succeeded` unlocking exactly
  once, idempotency under both sequential and concurrently-racing
  duplicate deliveries, `payment_intent.payment_failed` re-locking a
  `PAYMENT_PENDING` result, `charge.refunded` not re-locking an unlocked
  one, and the admin view's transaction list + revenue aggregation.
  129/129 total tests, 4/4 e2e passing.
- **Acceptance (verified against the real running app, not just tests,
  since a real Stripe account doesn't exist yet to verify the complete
  live flow)**: created a real `LOCKED` result via the actual assessment
  engine (not a fixture), then hit the live `POST
  /api/unlock/payment/create-intent` over HTTP and confirmed it fails
  cleanly with `503 provider_not_configured` and writes zero DB rows —
  the required "fail clean, don't fake it" behavior. Separately, built a
  `PAYMENT_PENDING` payment the way `create-intent` would once a real key
  exists, generated a real Stripe-signed webhook payload offline, and
  POSTed it to the live `/api/payments/webhook/stripe` endpoint — the
  server actually marked the payment `SUCCEEDED` and the result
  `UNLOCKED_BY_PAYMENT`, confirmed by re-fetching
  `GET /api/results/[attemptId]` with a real session cookie. Sent a
  tampered-signature payload to the same live endpoint and confirmed a
  `400` (Stripe-retry-worthy), not a silent `200`. In-browser: visited the
  real locked-results page, clicked "Unlock My Results – $1", and watched
  it hit the live endpoint and render the "not configured" message with
  no console errors; visited the real `/admin/payments` page as an admin
  and confirmed it rendered the transaction from the webhook test with
  the correct revenue summary. `npm run build`, `typecheck`, `lint`,
  `test` (129/129), `test:e2e` (4/4) all pass. Verified 2026-11-19.
  **Still outstanding**: a real Stripe test-mode account is needed to
  verify `createPaymentIntent` actually reaching Stripe's API, Stripe's
  own webhook delivery (vs. an offline-signed payload), and a real card's
  3-D Secure / `redirect: "if_required"` path end-to-end.

## Phase 9 — Email notifications & reminders — ✅ complete

- **Files**: `lib/reminders/{errors,eligibility,send,unsubscribe,
  unsubscribe-token}.ts` (new dedicated module, same naming convention as
  `lib/referrals/` and `lib/payments/`, rather than nesting purely under
  `lib/jobs/`), `lib/jobs/{connection,reminders-queue}.ts`,
  `workers/{index,reminder.worker}.ts` (the first real BullMQ worker
  process in this codebase — run via `npm run worker`),
  `app/api/cron/send-reminders/route.ts`, `app/unsubscribe/page.tsx`.
  `lib/email/templates.ts` gained `buildLockedReminderEmail`,
  `buildUnlockedReminderEmail`, `buildPaymentConfirmationEmail`.
  `package.json` gained `bullmq`.
- **Gap closed from Phase 8**: requirement.txt §2.2 step 8 ("user receives
  a confirmation email" after a successful $1 payment) was in the spec for
  Phase 8 but got missed — caught while reading the full requirement
  during this phase's planning and fixed here: `lib/payments/webhook.ts`'s
  `unlockViaPayment` now sends the confirmation email right after a
  successful unlock (best-effort, swallowed on failure — see `docs/API.md`
  §4 for why throwing here would be actively harmful, not just unhelpful).
- **First real background job queue**: every prior "this should really be
  a job" case (assessment auto-expiry Phase 5, referral qualification
  Phase 7, even payment webhook processing Phase 8) was deliberately kept
  synchronous because no BullMQ/worker infrastructure existed yet and each
  had a request to hang off of. Weekly reminders don't — nothing a user
  does triggers "7 days have now passed" — so this phase is what finally
  justified building the real thing: `lib/jobs/connection.ts` (a BullMQ-
  specific Redis connection, deliberately separate from
  `lib/rate-limit`'s, since BullMQ requires `maxRetriesPerRequest: null`),
  a `reminders` queue, and `workers/reminder.worker.ts` as a genuinely
  separate long-running process from the Next.js app.
- **DB**: migration `20261119150000_reminder_unsubscribe` — added
  `User.reminderUnsubscribedAt`. No change needed to `email_reminders`
  (already fully specced since the Foundation phase) or `system_settings`
  (`reminder_interval_days: 7`, `reminder_max_count: 10` were already
  seeded since Phase 2, unused until now).
- **API**: `POST /api/cron/send-reminders` (shared-secret bearer auth, no
  user session — see `docs/API.md` §7.1), `GET /unsubscribe` (page, HMAC
  token, idempotent). Full eligibility and idempotency design in
  `docs/API.md` §7.1 and `docs/ARCHITECTURE.md` §5.
- **Product decision (new, documented assumption)**: requirement.txt's
  two stop conditions — "unlocked" and "viewed" — are independent per the
  spec's own wording ("stop when results are unlocked *and* viewed"), so
  an already-unlocked-but-never-viewed result still gets reminded, just
  with different copy (no $1/referral call-to-action, since there's
  nothing left to unlock) than a still-locked one. The variant is chosen
  from live `resultAccessState` at send time, not a stale snapshot from
  when the job was enqueued.
- **Tests**: 21 new integration tests — interval timing (not due before,
  due after, second reminder counted from the *last reminder sent*, not
  original submission), `EXPIRED`-only assessments excluded (same
  genuine-completion distinction as Phase 7's referral qualification),
  viewed/deleted/unsubscribed/max-count stop conditions, retake precedent
  (only the most recent submitted attempt drives eligibility), correct
  email variant for locked vs. unlocked-but-unviewed, idempotency under
  concurrently racing duplicate sends, live re-check of stop conditions at
  send time (not just enqueue time), `deliveryStatus` flipping to
  `"failed"` on a provider error, unsubscribe token verification +
  idempotent unsubscribe, and — the one genuinely new kind of test in this
  codebase — a real BullMQ job enqueued and processed end-to-end by an
  actual in-process `Worker` against real Redis, no mocking. 150/150 total
  tests, 4/4 e2e passing.
- **Acceptance (verified against the real running app)**: started the
  Next.js dev server *and* a separate real `npm run worker` process side
  by side. Created a real locked result via the actual assessment engine
  with `submittedAt` backdated 8 days (to simulate elapsed time without
  waiting). Hit the live `POST /api/cron/send-reminders` with no auth
  header (`401`), a wrong secret (`401`), then the real one — `{"enqueued":
  1}`. The separately-running worker process picked the job up off Redis
  within seconds and logged the actual reminder email
  (`deliveryStatus: "sent"` confirmed in the DB). Immediately re-triggered
  the same cron endpoint — `{"enqueued": 0}`, confirming it's correctly
  not due again for another 7 days. Visited the real unsubscribe link
  from that email's body in-browser and confirmed `reminderUnsubscribedAt`
  was actually set in the DB, with the page rendering a clean confirmation.
  `npm run build`, `typecheck`, `lint`, `test` (150/150), `test:e2e` (4/4)
  all pass. Verified 2026-11-19.
  **Still outstanding**: no external scheduler actually calls
  `/api/cron/send-reminders` on a recurring basis yet — wiring one
  (crontab, Vercel Cron, etc.) is a Phase 14 hosting decision per
  `docs/ARCHITECTURE.md` §1, same as every other "final hosting" item;
  until then, the sweep must be triggered manually or by a temporary cron
  entry. A delivery that fails at the email-provider level is not retried
  at the same `reminderNumber` (see `docs/API.md` §7.1 "Known gap").

## Phase 10 — Gamification — ✅ complete

- **Files**: `lib/gamification/{xp,levels,badges,summary,leaderboard,
  leaderboard-read,actions}.ts`, `lib/jobs/leaderboard-queue.ts`,
  `workers/leaderboard.worker.ts`, `lib/http/gamification-response.ts`,
  `app/api/gamification/me/route.ts`, `app/api/leaderboard/route.ts`,
  `app/(public)/leaderboard/page.tsx`,
  `components/gamification/{GamificationPanel,
  LeaderboardVisibilityToggle}.tsx`. `prisma/seed.ts` and the shared test
  fixture (`tests/integration/helpers/assessment-fixtures.ts`) both now
  seed the 6 `achievements` rows from `BADGE_DEFINITIONS` (single source
  of truth, same pattern as `QUESTION_CATEGORIES`).
- **No admin badge/level config UI built** — the roadmap stub's "if
  needed" was conditional, and requirement.txt gives fixed example
  levels/badges with no indication they need to be admin-editable content
  (unlike questions or assessment templates, which explicitly are). XP
  amounts, level thresholds, and badge conditions are plain constants in
  `lib/gamification/{xp,levels,badges}.ts` — concrete, documented
  assumptions (the spec gives badge/level *names*, not earning conditions
  or XP numbers) that can be retuned without a migration if that changes.
- **DB**: no new migration — `achievements`, `user_achievements`,
  `xp_transactions`, `leaderboard_entries` all already existed in full
  since Phase 2's initial schema.
- **Hooks, not new trigger points**: XP/badge evaluation rides the same
  two call sites every other cross-cutting concern in this codebase
  already hangs off — `lib/assessment/submit.ts` `finalizeAssessment`
  (genuine user submit only, never `EXPIRED`, same completion distinction
  Phase 7 draws for referral qualification) and
  `lib/referrals/qualification.ts` `checkAndQualifyReferral` (to the
  *referrer*, on the same qualification event that triggers their unlock).
  No new background job needed for either — unlike Phase 9's reminders,
  both are already request-triggered events with no "time has passed"
  component.
- **XP-farming prevention**: `xp_transactions`' `(userId, reason,
  referenceId)` unique constraint is the actual guarantee, not
  application logic — same idempotent-write pattern as every other
  "exactly once" constraint in this codebase (`payments.idempotencyKey`,
  `email_reminders`' `(userId, reminderNumber)`, etc.). `referenceId` is
  the qualifying event's own id, so a legitimate retake (a new assessment
  id) still earns XP while a retried/duplicate call for the same event
  never double-awards.
- **Badges are evaluated, not stored as rules**: `lib/gamification/
  badges.ts` checks each of the 6 conditions against live data every time
  (first-submitted-assessment count, `accuracyPercentage`, per-category
  breakdown via `logical-reasoning`/`pattern-recognition` category ids,
  5th-submission count, referral qualification threshold) rather than
  caching "which badges exist to check" — award is idempotent via
  `user_achievements`' unique constraint, and each new badge also awards
  its own `BADGE_BONUS` XP in the same call.
- **Leaderboard**: `recomputeLeaderboards()` (`lib/gamification/
  leaderboard.ts`) does a full delete-and-rebuild per `(period,
  periodKey)` from `xp_transactions`, excluding anyone with
  `publicLeaderboardOptIn: false` — not an incremental update,
  specifically so an opt-out takes effect on the very next run rather
  than leaving a stale row. Driven by a BullMQ **Job Scheduler** (`lib/
  jobs/leaderboard-queue.ts`, every 5 minutes, self-scheduling —
  genuinely different from Phase 9's reminder sweep, which needed an
  external HTTP trigger specifically because it has per-user eligibility
  to compute; nothing external needs to decide *when* to recompute a
  leaderboard). Reads never expose email or user id — `displayName` falls
  back to an anonymized `Player <id prefix>` label when unset.
- **Visibility toggle is a Server Action, not a Route Handler** —
  `lib/gamification/actions.ts` `setLeaderboardVisibility`, per
  `docs/ARCHITECTURE.md` §3's pre-existing, explicit "toggling leaderboard
  visibility" example of a low-risk, purely-UI mutation where the same
  server-side authorization check still applies. First Server Action in
  this codebase.
- **Deferred, documented, not silently dropped**: requirement.txt Part 7
  also lists **streaks** and **daily challenges** alongside XP/levels/
  badges/leaderboards. Not built this phase — no schema support exists
  for either (no streak field on `User`, no `DailyChallenge` content
  model) and neither was in this phase's roadmap file list (only the four
  tables above). Building them means designing a new content type with
  admin management and rotation logic, which is a scoping decision, not
  an implementation detail — flagged here rather than guessed at. The
  `XpReason.DAILY_CHALLENGE` enum value (seeded since the Foundation
  phase) is left in place, unused, for whenever this gets its own phase.
  See `docs/ARCHITECTURE.md` §7.
- **Tests**: 22 new tests — XP farming prevention (duplicate
  `(userId, reason, referenceId)` is a no-op; different reference ids,
  e.g. legitimate retakes, both count), `ASSESSMENT_COMPLETED` XP/badges
  never awarded for an `EXPIRED` assessment, all 6 badge conditions
  (including a negative case — no Perfect Accuracy/Logic Master/Pattern
  Detective on an all-incorrect run, and Challenge Champion specifically
  *not* awarded before the 5th submission), badge-and-bonus-XP award
  idempotent under re-evaluation, the referral-qualification hook awarding
  both XP and the Referral Champion badge to the referrer at the real
  threshold, `getGamificationSummary` end-to-end, leaderboard ranking
  order, opt-out exclusion (both "never appears" and "disappears after
  opting out mid-way"), WEEKLY/MONTHLY correctly scoped to the current
  period only (not all-time), and `isCurrentUser` flagging. 172/172 total
  tests, 4/4 e2e passing.
- **Acceptance (verified against the real running app)**: started the
  dev server *and* the real worker process together; the worker's startup
  log confirmed the leaderboard Job Scheduler ran its first pass
  immediately (`[worker:leaderboard] completed job
  repeat:recompute-leaderboard-recurring:...`) — convenient, since it
  meant no artificial wait was needed to see it work. Created two real
  users through the actual assessment engine (one scored perfectly, one
  didn't), hit the live `GET /api/gamification/me` and got back exactly
  180 XP / Explorer / 4 badges for the perfect run, matching the test
  suite's own math precisely. Logged into the real dashboard in-browser
  and saw the same XP bar, level, and badge grid (4 lit up, 2 greyed out)
  render correctly. Clicked "Hide me" on the real visibility toggle,
  confirmed `publicLeaderboardOptIn` actually flipped to `false` in the
  database (not just the optimistic UI state), re-ran a real recompute,
  and confirmed that user actually disappeared from the live
  `GET /api/leaderboard` response and the public `/leaderboard` page.
  `npm run build`, `typecheck`, `lint`, `test` (172/172), `test:e2e`
  (4/4) all pass. Verified 2026-11-20.
  **Bug caught and fixed during this verification pass**: `workers/
  index.ts`'s top-level `await scheduleLeaderboardRecompute()` crashed
  the worker process outright (`tsx` transforms this entrypoint as CJS,
  which doesn't support top-level await) — never caught by `typecheck`
  or `build`, since both only type-check/bundle the Next.js app, not the
  separate `workers/` entrypoint's runtime execution. Fixed by wrapping
  `workers/index.ts` in an async `main()` function. This is exactly why
  "verify against the real running app" is a separate, non-skippable step
  from the static checks.

## Phase 11 — Social sharing (+ remaining SEO content) — ✅ complete

- **Files**: `lib/sharing/{errors,slug,types,certificate,public-card,
  copy}.ts`, `lib/http/share-response.ts`,
  `app/api/share/{certificate/route,[publicSlug]/route}.ts`,
  `components/sharing/{ShareSheet,CertificateShare}.tsx`,
  `app/(public)/u/[publicSlug]/{page,opengraph-image}.tsx`,
  `lib/seo/category-content.ts`, `components/seo/CategoryLandingPage.tsx`,
  5 category `app/(public)/<slug>-test/page.tsx` files, `app/(public)/
  {free-iq-test,online-iq-test,how-iq-is-calculated}/page.tsx`,
  `lib/blog/posts.ts`, `content/blog/*.mdx` (12 articles),
  `components/blog/{SequenceDiagram,MatrixDiagram}.tsx`,
  `mdx-components.tsx`, `app/(public)/blog/{page,[slug]/page}.tsx`.
  `lib/results/access.ts` exported `UNLOCKED_STATES` for reuse rather than
  duplicating the unlocked-state list. `lib/seo/json-ld.ts` gained
  `articleJsonLd`. `lib/seo/public-pages.ts`, `app/robots.ts`,
  `components/layout/{PublicHeader,PublicFooter}.tsx`, `next.config.ts`,
  `vitest.config.mts` (renamed from `.ts`) all updated — see notes below.
  `package.json` gained `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`
  (dependencies) and `@types/mdx`, `@mdx-js/rollup` (devDependencies).
- **DB**: no migration — `ShareableCertificate` existed in full since
  Phase 2, unused until now. `visibility_settings` jsonb has a concrete
  shape as of this phase: `{ showScore, showCategoryBreakdown, showBadges,
  indexable }` (`lib/sharing/types.ts` — `docs/DATABASE.md` updated).
- **API**: `POST /api/share/certificate` (idempotent get-or-create-or-
  update; the `publicSlug` never changes once issued), `GET
  /api/share/[publicSlug]` (public). See `docs/API.md` §6/§6.1 for the
  full contract.
- **Frontend**: `ShareSheet` (LinkedIn/X/WhatsApp/Facebook/Telegram +
  native share + copy link) wired into `LockedResult` for the generic,
  score-free pre-unlock invite; `CertificateShare` (visibility toggles +
  create/update) wired into `FullResult`/the results page for the
  post-unlock personalized card. `/u/[publicSlug]` (now inside the
  `(public)` route group, not flat — see `docs/ARCHITECTURE.md`'s module
  map note) + its `next/og`-based OG image route, both reading the same
  visibility-filtered payload so a hidden field can't leak into either
  surface. 5 category landing pages, `/free-iq-test`, `/online-iq-test`,
  `/how-iq-is-calculated`, and a 12-article MDX blog with Article +
  BreadcrumbList JSON-LD, real citations, and two small reusable diagram
  components.
- **Design correction during this phase**: the original sketch for
  blog frontmatter used the `remark-frontmatter`/`remark-mdx-frontmatter`
  plugin pair. That broke `next build` outright under Turbopack
  ("loader ... does not have serializable options" — remark/rehype plugin
  *functions* aren't serializable through Turbopack's loader config).
  Switched to MDX's own native `export const frontmatter = {...}` syntax,
  which needs no plugin at all; the two remark packages were removed
  before this phase was considered done, not left installed unused.
  Caught by actually running `next build`, not just `tsc`.
- **Gaps caught and fixed while doing this phase's site-wide SEO pass**
  (pre-existing, from earlier phases — not new Phase 11 bugs): `/admin`,
  `/assessment`, and `/results` were missing from `app/robots.ts`'s
  disallow list (the file was last touched in Phase 3, before those
  routes existed); `/leaderboard` (public/indexable since Phase 10) had
  never been added to `lib/seo/public-pages.ts`, so it was silently
  absent from the sitemap. Both fixed here; see `docs/SEO_STRATEGY.md`.
- **Decision**: `/u/[publicSlug]` is deliberately **not** in the sitemap —
  it's per-user and unbounded, unlike every other entry in
  `lib/seo/public-pages.ts`. An individual card's own opt-in `robots`
  meta is what allows indexing once a crawler reaches it via a real link.
- **Tests**: 13 new integration tests (`tests/integration/sharing.test.ts`)
  — ownership/not-found/not-unlocked rejections, slug stability across a
  settings update, and `getPublicCertificateCard` respecting each of the 4
  visibility toggles independently, checked by byte-level absence in the
  serialized JSON (same rigor as Phase 6's locked-result test) — plus 9
  new unit tests (`tests/unit/seo-metadata.test.ts` additions: unique
  metadata across the 12 blog posts, a noindex fallback for an unknown
  slug, `articleJsonLd`'s shape) and an expanded `sitemap-robots.test.ts`
  covering every new public page and the `/u/` exclusion. 188/188 total
  unit+integration tests, 9/9 e2e (`tests/e2e/phase-11-content.spec.ts`:
  category-page sample question interaction, primary-intent pages,
  blog index → article navigation, an unknown `/u/` slug 404ing, sitemap
  contents).
- **Acceptance (verified against the real running app, not just tests)**:
  registered a real free-tier user, completed and submitted an assessment
  through the actual engine (perfect score, 200/"Exceptional"), then
  exercised the full HTTP flow with curl — unauthenticated certificate
  creation correctly `401`s; authenticated creation with
  `{showScore:true, showCategoryBreakdown:false, showBadges:true,
  indexable:false}` returned a real 16-char slug; `GET
  /api/share/[slug]` returned exactly those fields (score + badges
  present, `categoryBreakdown` absent — confirmed by substring search, not
  just "the UI doesn't show it"); the public page rendered the score,
  badges, and a working "Take the assessment" CTA, with `<meta
  name="robots" content="noindex, follow">`; the OG image route returned
  a real 1200×630 PNG with the score baked in. Called the same endpoint
  again with `{showScore:false, showCategoryBreakdown:true,
  showBadges:false, indexable:true}` and confirmed the **same slug**
  came back with the settings flipped (score/badges now absent,
  breakdown now present, `robots` now `index, follow`) — the idempotent-
  update contract holds under a real settings change, not just a repeat
  of the same call. Separately submitted an unanswered attempt as a
  non-free-tier user (genuinely `LOCKED`), confirmed the results page
  rendered the generic "Invite friends" share sheet with zero score
  patterns anywhere in the HTML, and confirmed `POST
  /api/share/certificate` against that `LOCKED` result correctly
  returned `409`. Caught and fixed a real stale-server trap identical to
  Phase 3's note — an old `next-server` process from an earlier `npm run
  start` kept listening on port 3000 after `pkill -f "next start"`
  matched the wrong process name, silently serving a build from before
  the blog pages existed, until `lsof -i :3000` caught it and it was
  killed directly by PID. `npm run build`, `typecheck`, `lint`, `test`
  (188/188), `test:e2e` (9/9) all pass. Verified 2026-11-20.

## Phase 12 — Analytics & monitoring (product analytics)

- **Files**: `lib/analytics/*` (GA4/GTM wiring), admin analytics dashboard
  queries.
- **DB**: read-only aggregation queries against existing tables.
- **API**: `app/api/admin/analytics`.
- **Tests**: verifies no PII/answer content is sent to GA4 (Part 11
  constraint) via a wrapper that allow-lists event properties.
- **Acceptance**: the funnel events in Part 11 are all firing and visible in
  the admin analytics view, with UTM attribution intact.

## Phase 13 — Performance & ops monitoring

- **Files**: New Relic/OpenTelemetry wiring, Lighthouse CI config, bundle-
  budget CI check.
- **Acceptance**: Core Web Vitals, API latency, DB latency, job failures,
  and email/payment failures are all visible in a dashboard; budgets from
  `docs/PERFORMANCE.md` enforced in CI.

## Phase 14 — Production deployment

- **Files**: hosting config (finalize Vercel + worker host + managed
  Postgres/Redis, or an alternative decided at this point), env/secrets
  setup, CDN/object-storage config for question images.
- **Acceptance**: production environment serves real traffic with all prior
  phases' tests green against it, monitoring live, backups/rollback plan
  documented.

## Cross-cutting (apply within every phase, not a phase of their own)

- Update `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md` when a
  phase changes them (Part 16 §Step 6).
- Mobile verification and SEO/performance checks for any phase touching a
  public page (Part 17 Definition of Done).
- No phase is marked done with a mock/UI-only implementation (Part 16, hard
  rule).
