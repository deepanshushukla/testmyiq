import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Button, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";

const TITLE = "Free IQ Test — No Credit Card, Two Real Ways to Unlock Your Report";
const DESCRIPTION =
  "Take a free IQ-style cognitive assessment online. See exactly how the free tier and referral unlock work — no trial period, no hidden credit card requirement.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/free-iq-test",
});

export default function FreeIqTestPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/free-iq-test" })} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Free IQ Test", path: "/free-iq-test" },
        ])}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Free IQ Test", href: "/free-iq-test" }]} />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            A free IQ test that&apos;s actually free — not a free trial
          </h1>
          <p className="text-neutral-600">
            A lot of &quot;free IQ test&quot; results pages ask for a credit card or
            charge you right before showing the number. This isn&apos;t that. Taking
            our timed cognitive assessment costs nothing, for everyone, always.
            Getting your full detailed report afterward is free too — for two
            specific groups of people, explained below.
          </p>
        </div>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">
            Free path #1: the first 10 verified users
          </h2>
          <p className="text-neutral-600">
            The very first 10 people to register and verify their email address
            get their full report immediately — no payment, no inviting anyone.
            This is a fixed, enforced cap (not a rolling promotion), so once
            it&apos;s used it&apos;s used.
          </p>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">
            Free path #2: invite two friends who complete their own assessment
          </h2>
          <p className="text-neutral-600">
            After the first-10 cap is reached, you can still unlock your report
            for free. Share your personal referral link; once two people you
            invited register, verify their email, and finish their own
            assessment, your report unlocks automatically. No purchase required
            at any point in that path.
          </p>
        </Card>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">What &quot;free&quot; doesn&apos;t mean here</h2>
          <p className="text-neutral-600">
            It doesn&apos;t mean a watered-down test. Everyone — free or paid —
            takes the same 30-question, 10-category assessment under the same
            server-enforced timer, and gets the same scoring methodology. The
            only thing that differs by unlock path is when you see the detailed
            breakdown, never how the test itself is administered or graded.
          </p>
        </div>

        <Card className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-lg font-medium text-neutral-900">Start free, right now</h2>
          <p className="text-sm text-neutral-600">
            Registration takes an email address — no password, no card.
          </p>
          <Link href="/register">
            <Button>Start your free assessment</Button>
          </Link>
        </Card>

        <p className="text-neutral-600">
          Want the full pricing breakdown, including the $1 instant-unlock
          option?{" "}
          <Link href="/pricing" className="text-brand-600 underline">
            See pricing
          </Link>
          , or read{" "}
          <Link href="/faq" className="text-brand-600 underline">
            frequently asked questions
          </Link>
          .
        </p>
      </main>
    </>
  );
}
