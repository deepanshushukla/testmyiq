import Link from "next/link";
import type { Metadata } from "next";
import { Button, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { organizationJsonLd, webPageJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { APP_NAME } from "@/lib/seo/constants";

const TITLE = "Free Online Cognitive Assessment — Test Your Reasoning Skills";
const DESCRIPTION =
  "Take a free, timed cognitive assessment covering logical, numerical, abstract, and spatial reasoning. Get a detailed performance report in about 20 minutes.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/" })} />

      <main className="flex flex-col gap-16 px-6 py-16">
        <section className="mx-auto flex max-w-3xl flex-col items-start gap-6 text-left">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            How sharp is your reasoning, really?
          </h1>
          <p className="text-lg text-neutral-600">
            {APP_NAME} is a free, timed online cognitive assessment. 30 questions,
            about 20 minutes, covering logical, numerical, abstract, spatial, and
            pattern reasoning — then a detailed breakdown of exactly where
            you&apos;re strong and where you&apos;re not.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register">
              <Button variant="primary">Start your assessment</Button>
            </Link>
            <Link href="/how-it-works">
              <Button variant="secondary">See how it works</Button>
            </Link>
          </div>
          <p className="text-sm text-neutral-500">
            Your results are an estimated cognitive performance score, not a
            clinically or professionally validated IQ score.
          </p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-neutral-900">Detailed breakdown</h2>
            <p className="text-sm text-neutral-600">
              See your accuracy, completion time, and performance by category
              and difficulty — not just one number.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-neutral-900">Free to start</h2>
            <p className="text-sm text-neutral-600">
              Our first 10 verified users get their full report free.
              Everyone else unlocks it for $1 or by inviting two friends.
            </p>
          </Card>
          <Card className="flex flex-col gap-2">
            <h2 className="text-base font-medium text-neutral-900">Track your progress</h2>
            <p className="text-sm text-neutral-600">
              Earn XP, unlock badges, and see how you rank — only if you
              choose to show up on the leaderboard.
            </p>
          </Card>
        </section>

        <section className="mx-auto max-w-3xl text-center">
          <p className="text-neutral-600">
            Curious how scoring actually works?{" "}
            <Link href="/how-it-works" className="text-brand-600 underline">
              Read how it works
            </Link>{" "}
            or check the{" "}
            <Link href="/faq" className="text-brand-600 underline">
              FAQ
            </Link>
            .
          </p>
        </section>
      </main>
    </>
  );
}
