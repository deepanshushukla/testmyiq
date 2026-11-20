import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { BLOG_SLUGS } from "@/lib/blog/posts";
import { CATEGORY_CONTENT } from "@/lib/seo/category-content";

const PRIVATE_PATHS = [
  "/login",
  "/register",
  "/verify",
  "/dashboard",
  "/admin",
  "/assessment",
  "/results",
  "/api",
];

describe("sitemap", () => {
  it("includes every public page and excludes every private route", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    const publicPaths = [
      "/",
      "/how-it-works",
      "/pricing",
      "/faq",
      "/free-iq-test",
      "/online-iq-test",
      "/how-iq-is-calculated",
      "/leaderboard",
      "/blog",
      ...CATEGORY_CONTENT.map((entry) => `/${entry.slug}`),
      ...BLOG_SLUGS.map((slug) => `/blog/${slug}`),
    ];
    for (const path of publicPaths) {
      expect(urls.some((url) => url === new URL(path, "http://localhost:3000").toString())).toBe(
        true,
      );
    }

    for (const path of PRIVATE_PATHS) {
      expect(urls.some((url) => url.includes(path))).toBe(false);
    }

    // Per-user dynamic share cards are never statically enumerated here.
    expect(urls.some((url) => url.includes("/u/"))).toBe(false);
  });

  it("gives every entry a priority and change frequency", () => {
    for (const entry of sitemap()) {
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.changeFrequency).toBeTruthy();
    }
  });
});

describe("robots", () => {
  it("disallows every private route", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow;
    const disallowList = Array.isArray(disallow) ? disallow : [disallow];

    for (const path of [
      "/login",
      "/register",
      "/verify",
      "/dashboard",
      "/admin",
      "/assessment",
      "/results",
      "/api/",
    ]) {
      expect(disallowList).toContain(path);
    }
  });

  it("references the sitemap", () => {
    expect(robots().sitemap).toContain("/sitemap.xml");
  });
});
