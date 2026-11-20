import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
};

// content/blog/*.mdx files export a `frontmatter` object (title,
// description, publishedAt, updatedAt, author, relatedCategorySlug) using
// MDX's native top-level `export const` syntax — no remark-frontmatter
// plugin needed (and remark/rehype plugin functions aren't serializable
// through Turbopack's loader options, so passing no options here is
// deliberate, not an oversight). lib/blog/posts.ts reads the export via
// dynamic import.
const withMDX = createMDX({});

export default withMDX(nextConfig);
