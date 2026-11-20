import Link from "next/link";
import { APP_NAME } from "@/lib/seo/constants";
import { CATEGORY_CONTENT } from "@/lib/seo/category-content";

export function PublicFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 text-sm text-neutral-500">
        <nav aria-label="Categories" className="flex flex-wrap gap-4">
          {CATEGORY_CONTENT.map((entry) => (
            <Link key={entry.slug} href={`/${entry.slug}`} className="hover:text-neutral-900">
              {entry.categoryName}
            </Link>
          ))}
        </nav>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link href="/free-iq-test" className="hover:text-neutral-900">
            Free IQ test
          </Link>
          <Link href="/online-iq-test" className="hover:text-neutral-900">
            Online IQ test
          </Link>
          <Link href="/how-it-works" className="hover:text-neutral-900">
            How it works
          </Link>
          <Link href="/how-iq-is-calculated" className="hover:text-neutral-900">
            How it&apos;s calculated
          </Link>
          <Link href="/pricing" className="hover:text-neutral-900">
            Pricing
          </Link>
          <Link href="/blog" className="hover:text-neutral-900">
            Blog
          </Link>
          <Link href="/faq" className="hover:text-neutral-900">
            FAQ
          </Link>
        </nav>
        <p>
          {APP_NAME} reports an estimated cognitive performance score, not a
          clinically or professionally validated IQ score.
        </p>
      </div>
    </footer>
  );
}
