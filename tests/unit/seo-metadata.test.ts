import { describe, expect, it } from "vitest";
import { metadata as homeMetadata } from "@/app/(public)/page";
import { metadata as howItWorksMetadata } from "@/app/(public)/how-it-works/page";
import { metadata as pricingMetadata } from "@/app/(public)/pricing/page";
import { metadata as faqMetadata } from "@/app/(public)/faq/page";
import { metadata as freeIqTestMetadata } from "@/app/(public)/free-iq-test/page";
import { metadata as onlineIqTestMetadata } from "@/app/(public)/online-iq-test/page";
import { metadata as howCalculatedMetadata } from "@/app/(public)/how-iq-is-calculated/page";
import { metadata as logicalMetadata } from "@/app/(public)/logical-reasoning-test/page";
import { metadata as abstractMetadata } from "@/app/(public)/abstract-reasoning-test/page";
import { metadata as numericalMetadata } from "@/app/(public)/numerical-reasoning-test/page";
import { metadata as spatialMetadata } from "@/app/(public)/spatial-reasoning-test/page";
import { metadata as patternMetadata } from "@/app/(public)/pattern-recognition-test/page";
import { metadata as blogIndexMetadata } from "@/app/(public)/blog/page";

const publicPages = [
  { name: "home", metadata: homeMetadata },
  { name: "how-it-works", metadata: howItWorksMetadata },
  { name: "pricing", metadata: pricingMetadata },
  { name: "faq", metadata: faqMetadata },
  { name: "free-iq-test", metadata: freeIqTestMetadata },
  { name: "online-iq-test", metadata: onlineIqTestMetadata },
  { name: "how-iq-is-calculated", metadata: howCalculatedMetadata },
  { name: "logical-reasoning-test", metadata: logicalMetadata },
  { name: "abstract-reasoning-test", metadata: abstractMetadata },
  { name: "numerical-reasoning-test", metadata: numericalMetadata },
  { name: "spatial-reasoning-test", metadata: spatialMetadata },
  { name: "pattern-recognition-test", metadata: patternMetadata },
  { name: "blog-index", metadata: blogIndexMetadata },
];

describe("public page metadata", () => {
  it("has a non-empty title and description for every page", () => {
    for (const page of publicPages) {
      expect(page.metadata.title).toBeTruthy();
      expect(page.metadata.description).toBeTruthy();
    }
  });

  it("has a unique title across all public pages", () => {
    const titles = publicPages.map((page) => page.metadata.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has a unique description across all public pages", () => {
    const descriptions = publicPages.map((page) => page.metadata.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("has a unique, absolute canonical URL across all public pages", () => {
    const canonicals = publicPages.map((page) => page.metadata.alternates?.canonical);
    expect(canonicals.every((url) => typeof url === "string" && url.startsWith("http"))).toBe(
      true,
    );
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  it("sets robots: index:false on every private page", async () => {
    const { metadata: registerMetadata } = await import("@/app/(auth)/register/page");
    const { metadata: loginMetadata } = await import("@/app/(auth)/login/page");
    const { metadata: verifyMetadata } = await import("@/app/(auth)/verify/page");
    const { metadata: dashboardMetadata } = await import("@/app/dashboard/page");
    const { metadata: notFoundMetadata } = await import("@/app/not-found");

    const privateMetadata = [
      registerMetadata,
      loginMetadata,
      verifyMetadata,
      dashboardMetadata,
      notFoundMetadata,
    ];

    for (const metadata of privateMetadata) {
      expect(metadata.robots).toMatchObject({ index: false });
    }
  });
});

describe("blog post metadata", () => {
  it("builds unique, non-empty metadata for every one of the 12 posts", async () => {
    const { BLOG_SLUGS } = await import("@/lib/blog/posts");
    const { generateMetadata } = await import("@/app/(public)/blog/[slug]/page");

    expect(BLOG_SLUGS.length).toBe(12);

    const metadataList = await Promise.all(
      BLOG_SLUGS.map((slug) => generateMetadata({ params: Promise.resolve({ slug }) })),
    );

    const titles = metadataList.map((metadata) => metadata.title);
    const descriptions = metadataList.map((metadata) => metadata.description);
    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("returns a noindex fallback for an unknown slug", async () => {
    const { generateMetadata } = await import("@/app/(public)/blog/[slug]/page");
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "does-not-exist" }) });
    expect(metadata.robots).toMatchObject({ index: false });
  });
});

describe("articleJsonLd", () => {
  it("builds Article structured data matching the post's visible authorship/dates", async () => {
    const { articleJsonLd } = await import("@/lib/seo/json-ld");
    const data = articleJsonLd({
      title: "Example Post",
      description: "Example description",
      path: "/blog/example-post",
      author: "Jane Doe",
      publishedAt: "2026-11-20",
      updatedAt: "2026-11-21",
    });

    expect(data["@type"]).toBe("Article");
    expect(data.author).toMatchObject({ name: "Jane Doe" });
    expect(data.datePublished).toBe("2026-11-20");
    expect(data.dateModified).toBe("2026-11-21");
  });
});
