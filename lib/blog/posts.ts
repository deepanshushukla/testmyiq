import type { ComponentType } from "react";

/** The 12 initial topics from requirement.txt Part 10 §Content marketing,
 * in their listed order (not publish-date order — see getAllPosts). */
export const BLOG_SLUGS = [
  "what-is-iq",
  "how-is-iq-measured",
  "what-is-a-good-iq-score",
  "how-accurate-are-online-iq-tests",
  "logical-reasoning-explained",
  "abstract-reasoning-explained",
  "spatial-reasoning-questions",
  "number-sequence-puzzles",
  "matrix-reasoning-questions",
  "iq-vs-eq",
  "what-does-a-cognitive-assessment-measure",
  "how-to-improve-logical-thinking",
] as const;

export type BlogSlug = (typeof BLOG_SLUGS)[number];

export type BlogFrontmatter = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  relatedCategorySlug?: string;
};

type BlogModule = { frontmatter: BlogFrontmatter; default: ComponentType };

/** The import path is a template literal, so TypeScript can't resolve the
 * exact module and infers `any` for the dynamic import — this cast pins
 * it back to the real, known MDX module shape (frontmatter + default
 * export) rather than leaving `any` to propagate to every caller. */
export async function getPostModule(slug: BlogSlug): Promise<BlogModule> {
  return (await import(`@/content/blog/${slug}.mdx`)) as BlogModule;
}

export async function getPostFrontmatter(slug: BlogSlug): Promise<BlogFrontmatter> {
  const mod = await getPostModule(slug);
  return mod.frontmatter;
}

export async function getAllPosts(): Promise<(BlogFrontmatter & { slug: BlogSlug })[]> {
  const posts = await Promise.all(
    BLOG_SLUGS.map(async (slug) => ({ slug, ...(await getPostFrontmatter(slug)) })),
  );
  return posts.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
