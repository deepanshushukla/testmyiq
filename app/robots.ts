import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo/constants";

/**
 * Private routes list per docs/SEO_STRATEGY.md §2. Individual pages also
 * carry their own `robots: { index: false }` metadata — belt and
 * suspenders, since robots.txt disallow doesn't deindex an already-crawled
 * URL, only prevents future crawling. `/admin`, `/assessment`, and
 * `/results` were missing from this list (added in Phases 4–6, after this
 * file was first written in Phase 3) — caught and fixed during this
 * phase's site-wide SEO pass.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/register",
        "/verify",
        "/dashboard",
        "/admin",
        "/assessment",
        "/results",
        "/api/",
      ],
    },
    sitemap: new URL("/sitemap.xml", BASE_URL).toString(),
  };
}
