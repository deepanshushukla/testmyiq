import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";
import { getAllPosts } from "@/lib/blog/posts";

const TITLE = "Blog — Cognitive Testing, Reasoning, and How to Improve";
const DESCRIPTION =
  "Original articles on IQ, cognitive testing methodology, and how to practice logical, spatial, and numerical reasoning.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/blog",
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/blog" })} />
      <JsonLd data={breadcrumbListJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }])} />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }]} />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Blog</h1>
          <p className="text-neutral-600">
            Original writing on cognitive testing methodology and reasoning skills — not
            mass-generated filler.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="flex flex-col gap-1 transition-colors hover:bg-neutral-50">
                <h2 className="text-lg font-medium text-neutral-900">{post.title}</h2>
                <p className="text-sm text-neutral-600">{post.description}</p>
                <p className="text-xs text-neutral-500">
                  {post.author} · {formatDate(post.publishedAt)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
