# SEO Strategy

Status: Draft v1 — foundation phase. Implements Part 10 of requirement.txt.
SEO is first-class from Phase 1 onward, not deferred.

## 1. Search intent → page mapping

| Intent / keyword cluster | Page | Primary content job |
|---|---|---|
| "free IQ test", "online IQ test", "test your IQ" | `/`, `/free-iq-test`, `/online-iq-test` | Convert broad intent into a registration + assessment start. Distinct angles: `/` is brand/product home, `/free-iq-test` emphasizes no-cost entry (first-10 + referral path), `/online-iq-test` emphasizes convenience/instant access — each needs genuinely different body content, not three templates of the same paragraph. |
| "logical reasoning test" | `/logical-reasoning-test` | Explains the category, sample question (non-scored, illustrative), CTA into full assessment. |
| "abstract reasoning test" | `/abstract-reasoning-test` | Same pattern, abstract-reasoning category. |
| "numerical reasoning test" | `/numerical-reasoning-test` | Same pattern, numerical category. |
| "spatial reasoning test" | `/spatial-reasoning-test` | Same pattern, spatial category. |
| "pattern recognition test" | `/pattern-recognition-test` | Same pattern, pattern-recognition category. |
| "how is IQ measured", informational | `/how-it-works`, `/how-iq-is-calculated` | Trust-building, methodology transparency — directly supports the "estimated score, not clinical IQ" framing (`docs/PRD.md` §6, `docs/SCORING.md`). |
| commercial ("IQ test cost") | `/pricing` | Explains $1 unlock vs. free-via-referral, no dark patterns. |
| support/trust queries | `/faq` | Addresses accuracy, privacy, payment, referral questions directly — also a FAQ structured-data candidate if content genuinely matches a Q&A format. |
| informational, long-tail, "brain puzzles" | `/blog` + 12 articles (Part 10 §Content marketing) — **implemented, Phase 11** | Top-of-funnel acquisition, internal links into the category landing pages. |
| "daily brain teaser" | `/daily-challenge/[date]` | Public, no-registration puzzle; indexable only once it has sufficient unique content per day (see §4). |

Each category landing page must contain **original** explanatory content and
at least one **original, non-scored sample question** for illustration —
never a real bank question (would leak answers via page source) and never
copied/paraphrased from myiq.com or any third party.

**Implemented, Phase 11**: all 5 category pages (`lib/seo/category-content.ts`
+ shared `components/seo/CategoryLandingPage.tsx`), `/free-iq-test`,
`/online-iq-test`, `/how-iq-is-calculated`, and the full blog system. The
5 category pages share layout markup but not content — each has a
genuinely distinct intro, "why it matters" section, and sample question,
which is what keeps them from being the thin/duplicate pages this section
prohibits.

## 2. Technical SEO checklist (tracked per-page in Definition of Done, Part 17)

- Server-rendered via Next.js App Router Server Components (default, not
  opt-in).
- Static generation (`generateStaticParams`/ISR) for all pages in §1 that
  don't need per-request personalization — i.e., everything except the
  authenticated app shell.
- `generateMetadata` per route: unique `<title>`, unique meta description,
  canonical URL.
- `app/sitemap.ts` generated from published content only (landing pages +
  published blog posts + daily-challenge pages that meet the uniqueness bar)
  — never includes `(auth)`, `(app)`, `/admin`, `/api`, or payment-callback
  routes. **`/u/[publicSlug]` is deliberately excluded** (Phase 11) — it's
  per-user, dynamically created, and unbounded, unlike every other entry in
  `lib/seo/public-pages.ts`, which is a fixed, enumerable list. An
  individual card can still be indexed via its own opt-in `robots` meta
  (below) once a crawler reaches it through a real link — the sitemap just
  never statically enumerates the unbounded set of possible slugs.
- `app/robots.ts` disallows `/admin`, `/api`, `/dashboard`, `/assessment`,
  `/results` (private results — only the opt-in `/u/[publicSlug]` can be
  public), login/register. **Gap fixed in Phase 11**: `/admin`,
  `/assessment`, and `/results` had never actually been added to the
  disallow list after Phases 4–6 introduced those routes (the file was
  last touched in Phase 3, before any of them existed) — caught during
  this phase's site-wide SEO pass, not before.
- Explicit `noindex` metadata (not just robots.txt exclusion, since
  robots.txt doesn't deindex already-crawled URLs) on: login, register,
  verify, admin, dashboard, active-assessment, private results, payment
  callback pages.
- Referral tracking parameters (`?ref=`) and any duplicate URL variants are
  handled via canonical tags pointing at the parameter-free URL — never
  indexed as separate pages.
- Open Graph + Twitter/X card metadata on every public page; dynamic OG image
  generation for shareable result cards (`/u/[publicSlug]`) via
  `next/og` or an edge image route.
- Semantic HTML (proper heading hierarchy, `<nav>`, `<main>`, landmark
  regions) and breadcrumbs on all content/category pages.
- Clean URLs (no query-string-driven canonical content), proper 301s for any
  future URL restructuring, a designed custom 404.
- Image `alt` text required on all content images (enforced by a lint rule /
  content-review checklist, not just convention).

## 3. Structured data (JSON-LD)

Only emitted where it matches visibible page content — no fabricated
ratings/reviews/certifications (hard constraint, Part 10):

| Schema | Where |
|---|---|
| `Organization` | Root layout, once branding/name exists. |
| `WebSite` (+ `SearchAction` if a site search ships later) | Root layout. |
| `WebPage` | Every public page, basic metadata mirror. |
| `BreadcrumbList` | Category pages, blog posts, daily-challenge pages. |
| `Article` | Blog posts, with real `author`, `datePublished`, `dateModified` — matching the visible authorship/update-date requirement in Part 10. **Implemented, Phase 11** (`articleJsonLd` in `lib/seo/json-ld.ts`), built from each post's own MDX frontmatter, never a placeholder. |

No `AggregateRating`, `Review`, or professional/clinical-credential schema
is ever emitted — there is nothing genuine to back it.

## 4. Daily challenge indexability rule

A `/daily-challenge/[date]` page is only included in the sitemap / left
indexable if that day's content meets a minimum uniqueness bar (original
puzzle + original explanation + enough surrounding context, not just an
image and an answer) — per spec, "create meaningful indexable challenge
pages only when they contain sufficient unique content." Thin days default
to `noindex` rather than being excluded from the product; the gate is purely
about search indexing, not about product availability.

## 5. Content marketing (Part 10 §Content marketing)

12 initial articles (listed in requirement.txt) are tracked in
`docs/DEVELOPMENT_ROADMAP.md` Phase 3/11 as content tasks, each requiring:
original writing, real examples, headings, internal links to the matching
category landing page, a clear CTA, visible authorship + last-updated date,
and citations for any scientific claim (e.g., referencing established
psychometric literature when explaining what IQ testing is, without claiming
this product provides a clinically equivalent score).

## 6. What's explicitly NOT done for SEO reasons alone

- No thin/duplicate pages created purely to catch a keyword variant (spec
  constraint, Part 10).
- No AI-mass-generated blog content (spec constraint).
- No schema that isn't backed by real, visible content.
