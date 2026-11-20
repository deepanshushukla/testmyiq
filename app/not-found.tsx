import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-24">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Page not found
      </h1>
      <p className="text-neutral-600">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/">
        <Button variant="primary">Back to home</Button>
      </Link>
    </main>
  );
}
