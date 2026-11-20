import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Button, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";

const TITLE = "Online IQ Test — Take It Instantly, No App or Appointment";
const DESCRIPTION =
  "Take a cognitive assessment online in about 20 minutes — no app to install, no appointment to book, no software requirement beyond a browser.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/online-iq-test",
});

export default function OnlineIqTestPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/online-iq-test" })} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "Online IQ Test", path: "/online-iq-test" },
        ])}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Online IQ Test", href: "/online-iq-test" }]} />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            An online cognitive assessment you can take right now
          </h1>
          <p className="text-neutral-600">
            There&apos;s no booking a session, no proctor, and nothing to install.
            Register with an email address, and the 30-question assessment opens
            in your browser — on a laptop, tablet, or phone — and takes about
            20 minutes.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-neutral-900">Server-enforced timing</h2>
            <p className="text-sm text-neutral-600">
              The countdown is tracked on our server, not in your browser tab —
              closing the tab, losing your connection, or refreshing the page
              doesn&apos;t pause it, extend it, or let you restart the clock.
              Whatever device you resume on, the deadline is exactly where you
              left it.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-neutral-900">Resume where you left off</h2>
            <p className="text-sm text-neutral-600">
              If you have to step away mid-assessment, coming back to the same
              link picks up your exact progress — the same attempt, same
              answers saved, same deadline. You&apos;re never forced to restart
              just because you closed the tab.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-neutral-900">Immediate scoring</h2>
            <p className="text-sm text-neutral-600">
              The moment you submit — or time runs out — your attempt is
              scored automatically. There&apos;s no waiting period or manual
              review step before a report exists.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-neutral-900">10 categories, one sitting</h2>
            <p className="text-sm text-neutral-600">
              Logical, numerical, abstract, spatial, pattern-recognition,
              matrix, deductive, visual, sequence-completion, and
              memory/attention reasoning are all covered in a single timed
              session, not ten separate mini-tests.
            </p>
          </Card>
        </div>

        <Card className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-lg font-medium text-neutral-900">Ready when you are</h2>
          <Link href="/register">
            <Button>Take the online assessment</Button>
          </Link>
        </Card>

        <p className="text-neutral-600">
          Curious how scoring actually works?{" "}
          <Link href="/how-iq-is-calculated" className="text-brand-600 underline">
            See how it&apos;s calculated
          </Link>
          , or read the full{" "}
          <Link href="/how-it-works" className="text-brand-600 underline">
            step-by-step walkthrough
          </Link>
          .
        </p>
      </main>
    </>
  );
}
