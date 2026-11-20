import type { Metadata } from "next";
import { APP_NAME, BASE_URL } from "./constants";

/**
 * Every public page builds its metadata through this one function so
 * title/description/canonical/OG/Twitter stay consistent — see
 * docs/SEO_STRATEGY.md §2. Private (auth) and /dashboard pages set their
 * own `robots: { index: false }` metadata directly instead of using this.
 */
export function buildPageMetadata(params: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { title, description, path } = params;
  const url = new URL(path, BASE_URL).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: APP_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
