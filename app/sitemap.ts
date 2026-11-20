import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo/constants";
import { PUBLIC_PAGES } from "@/lib/seo/public-pages";

/**
 * Generated only from PUBLIC_PAGES (docs/SEO_STRATEGY.md §2) — private
 * routes ((auth), /dashboard, /api) must never be added here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((page) => ({
    url: new URL(page.path, BASE_URL).toString(),
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
