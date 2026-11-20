import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Breadcrumbs, Button, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { articleJsonLd, breadcrumbListJsonLd } from "@/lib/seo/json-ld";
import { BLOG_SLUGS, getPostModule, type BlogSlug } from "@/lib/blog/posts";
import { CATEGORY_CONTENT } from "@/lib/seo/category-content";

export function generateStaticParams() {
  return BLOG_SLUGS.map((slug) => ({ slug }));
}

function isBlogSlug(slug: string): slug is BlogSlug {
  return (BLOG_SLUGS as readonly string[]).includes(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isBlogSlug(slug)) {
    return { title: "Article not found", robots: { index: false, follow: false } };
  }
  const { frontmatter } = await getPostModule(slug);
  return buildPageMetadata({
    title: frontmatter.title,
    description: frontmatter.description,
    path: `/blog/${slug}`,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isBlogSlug(slug)) {
    notFound();
  }

  const { default: Article, frontmatter } = await getPostModule(slug);
  const relatedCategory = frontmatter.relatedCategorySlug
    ? CATEGORY_CONTENT.find((entry) => entry.slug === frontmatter.relatedCategorySlug)
    : undefined;

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: frontmatter.title,
          description: frontmatter.description,
          path: `/blog/${slug}`,
          author: frontmatter.author,
          publishedAt: frontmatter.publishedAt,
          updatedAt: frontmatter.updatedAt,
        })}
      />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: frontmatter.title, path: `/blog/${slug}` },
        ])}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
            { name: frontmatter.title, href: `/blog/${slug}` },
          ]}
        />

        <article>
          <header className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
              {frontmatter.title}
            </h1>
            <p className="text-sm text-neutral-500">
              By {frontmatter.author} · Published {formatDate(frontmatter.publishedAt)}
              {frontmatter.updatedAt !== frontmatter.publishedAt &&
                ` · Updated ${formatDate(frontmatter.updatedAt)}`}
            </p>
          </header>

          <Article />
        </article>

        {relatedCategory && (
          <Card className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-lg font-medium text-neutral-900">
              Put {relatedCategory.categoryName.toLowerCase()} to the test
            </h2>
            <Link href={`/${relatedCategory.slug}`}>
              <Button variant="secondary">Try a {relatedCategory.categoryName} sample question</Button>
            </Link>
            <Link href="/register">
              <Button>Take the full assessment</Button>
            </Link>
          </Card>
        )}
      </main>
    </>
  );
}
