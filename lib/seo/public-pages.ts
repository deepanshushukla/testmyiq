import { BLOG_SLUGS } from "@/lib/blog/posts";
import { CATEGORY_CONTENT } from "@/lib/seo/category-content";

/**
 * Single source of truth for which routes are public/indexable, consumed
 * by app/sitemap.ts and the metadata tests. Adding a new public page in a
 * later phase means adding one entry here — the sitemap updates itself.
 *
 * `/u/[publicSlug]` (Phase 11 social sharing) is deliberately NOT listed
 * here — it's per-user, dynamically created, and unbounded, unlike every
 * fixed page below. Its own opt-in `robots: index` meta is what makes an
 * individual card indexable; see docs/SEO_STRATEGY.md §1/§2.
 *
 * `/leaderboard` was already public/indexable since Phase 10
 * (`docs/API.md` §6.1) but had never actually been added to this list —
 * caught and fixed while doing this phase's site-wide sitemap pass.
 */
export const PUBLIC_PAGES = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/free-iq-test", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/online-iq-test", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/how-iq-is-calculated", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/leaderboard", priority: 0.5, changeFrequency: "daily" as const },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
  ...CATEGORY_CONTENT.map((entry) => ({
    path: `/${entry.slug}`,
    priority: 0.8,
    changeFrequency: "monthly" as const,
  })),
  ...BLOG_SLUGS.map((slug) => ({
    path: `/blog/${slug}`,
    priority: 0.6,
    changeFrequency: "yearly" as const,
  })),
];
