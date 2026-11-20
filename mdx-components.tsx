import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/**
 * Required by @next/mdx for the App Router — every .mdx file renders
 * through this component map. Plain Tailwind utility classes (no
 * @tailwindcss/typography dependency) keep blog posts server-rendered
 * with zero added client JS, per docs/PERFORMANCE.md's budget concerns.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => <h2 className="mt-8 text-xl font-semibold text-neutral-900" {...props} />,
    h3: (props) => <h3 className="mt-6 text-lg font-medium text-neutral-900" {...props} />,
    p: (props) => <p className="mt-4 leading-relaxed text-neutral-700" {...props} />,
    ul: (props) => <ul className="mt-4 list-disc space-y-1 pl-6 text-neutral-700" {...props} />,
    ol: (props) => <ol className="mt-4 list-decimal space-y-1 pl-6 text-neutral-700" {...props} />,
    li: (props) => <li {...props} />,
    strong: (props) => <strong className="font-semibold text-neutral-900" {...props} />,
    blockquote: (props) => (
      <blockquote className="mt-4 border-l-2 border-brand-300 pl-4 italic text-neutral-600" {...props} />
    ),
    a: ({ href, ...props }) =>
      href ? (
        <Link href={href} className="text-brand-600 underline" {...props} />
      ) : (
        <a {...props} />
      ),
    ...components,
  };
}
