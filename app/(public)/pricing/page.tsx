import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Button, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";

const TITLE = "Pricing — Free for Early Users, $1 or Two Referrals After";
const DESCRIPTION =
  "See how unlocking your full assessment report works: free for our first 10 verified users, then $1 or invite two friends.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/pricing" })} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing", path: "/pricing" },
        ])}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Pricing", href: "/pricing" }]} />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Taking the assessment is always free. Unlocking your report has two options.
          </h1>
          <p className="text-neutral-600">
            You never pay anything to take the assessment itself. Payment or
            referrals only ever apply to unlocking your full, detailed report
            afterward.
          </p>
        </div>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">Free, for our first 10 verified users</h2>
          <p className="text-neutral-600">
            The first 10 people to register and verify their email get full,
            immediate access to their report — no payment, no referrals.
            After that, you&apos;ll need one of the two options below.
          </p>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-neutral-900">Unlock for $1</h2>
            <p className="text-neutral-600">
              After completing your assessment, pay $1 to unlock your full
              report immediately. No subscription, no recurring charge —
              it&apos;s a one-time unlock for that result.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <h2 className="text-lg font-medium text-neutral-900">Unlock for free — invite 2 friends</h2>
            <p className="text-neutral-600">
              Share your referral link. Once two friends register, verify
              their email, and complete their own assessment, your report
              unlocks automatically — free.
            </p>
          </Card>
        </div>

        <p className="text-neutral-600">
          Questions about how referrals qualify or how payment works?{" "}
          <Link href="/faq" className="text-brand-600 underline">
            Check the FAQ
          </Link>
          .
        </p>

        <div>
          <Link href="/register">
            <Button variant="primary">Start your assessment</Button>
          </Link>
        </div>
      </main>
    </>
  );
}
