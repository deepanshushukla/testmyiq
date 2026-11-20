import { APP_NAME, BASE_URL } from "./constants";

/**
 * Only the schema types documented in docs/SEO_STRATEGY.md §3
 * (Organization, WebSite, WebPage, BreadcrumbList, Article) — and only ever
 * built from our own authored copy, never user-generated content. No fake
 * ratings/reviews/certifications, per spec Part 10.
 */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: APP_NAME,
    url: BASE_URL,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: APP_NAME,
    url: BASE_URL,
  };
}

export function webPageJsonLd(params: { title: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: params.title,
    description: params.description,
    url: new URL(params.path, BASE_URL).toString(),
  };
}

export function articleJsonLd(params: {
  title: string;
  description: string;
  path: string;
  author: string;
  publishedAt: string;
  updatedAt: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.title,
    description: params.description,
    url: new URL(params.path, BASE_URL).toString(),
    author: { "@type": "Person", name: params.author },
    datePublished: params.publishedAt,
    dateModified: params.updatedAt,
    publisher: { "@type": "Organization", name: APP_NAME },
  };
}

export function breadcrumbListJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, BASE_URL).toString(),
    })),
  };
}
