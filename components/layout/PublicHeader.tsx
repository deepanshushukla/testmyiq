import Link from "next/link";
import { Button } from "@/components/ui";
import { APP_NAME } from "@/lib/seo/constants";

export function PublicHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-neutral-900">
          {APP_NAME}
        </Link>
        <nav aria-label="Primary" className="flex gap-6 text-sm text-neutral-600">
          <Link href="/how-it-works" className="hover:text-neutral-900">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-neutral-900">
            Pricing
          </Link>
          <Link href="/blog" className="hover:text-neutral-900">
            Blog
          </Link>
          <Link href="/leaderboard" className="hover:text-neutral-900">
            Leaderboard
          </Link>
          <Link href="/faq" className="hover:text-neutral-900">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-neutral-600 hover:text-neutral-900">
            Log in
          </Link>
          <Link href="/register">
            <Button>Start assessment</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
