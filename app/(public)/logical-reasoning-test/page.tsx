import type { Metadata } from "next";
import { CATEGORY_CONTENT } from "@/lib/seo/category-content";
import { CategoryLandingPage } from "@/components/seo/CategoryLandingPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";

const content = CATEGORY_CONTENT.find((entry) => entry.slug === "logical-reasoning-test")!;

export const metadata: Metadata = buildPageMetadata({
  title: content.title,
  description: content.description,
  path: `/${content.slug}`,
});

export default function LogicalReasoningTestPage() {
  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: content.title, description: content.description, path: `/${content.slug}` })}
      />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: content.categoryName, path: `/${content.slug}` },
        ])}
      />
      <CategoryLandingPage content={content} />
    </>
  );
}
