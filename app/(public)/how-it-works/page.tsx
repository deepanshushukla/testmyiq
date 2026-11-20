import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";

const TITLE = "How It Works — Taking the Assessment and Getting Your Results";
const DESCRIPTION =
  "How the cognitive assessment works end to end: registration, the timed 30-question test, scoring, and how to unlock your full report.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/how-it-works",
});

const steps = [
  {
    title: "1. Register and verify your email",
    body: "Sign up with just your email — no password. We send a 6-digit code and a one-click link; either one verifies you and signs you in.",
  },
  {
    title: "2. Take the timed assessment",
    body: "30 questions across logical, numerical, abstract, spatial, pattern-recognition, matrix, deductive, visual, sequence, and memory/attention reasoning. You get about 20 minutes, and the countdown is enforced by our server, not your browser — closing the tab or losing connection won't reset it or let you extend it.",
  },
  {
    title: "3. We score your attempt",
    body: "Once you submit (or time runs out), we calculate your accuracy, your performance by category and difficulty, and an estimated cognitive performance score. Unanswered and incorrect questions are both scored as 0 — we don't penalize guesses, and we don't reward speed over accuracy.",
  },
  {
    title: "4. Unlock your full report",
    body: "Our first 10 verified users get their full report immediately, free. Everyone else sees a locked summary (completion confirmed, time taken, XP earned) until they unlock the detailed breakdown — either by paying $1 or by inviting two friends who register, verify, and complete their own assessment.",
  },
  {
    title: "5. Share your results and keep going",
    body: "Once unlocked, you can share a personalized result card, earn XP and badges, and see how you compare on the leaderboard — only if you choose to make your results visible.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/how-it-works" })} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "How it works", path: "/how-it-works" },
        ])}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "How it works", href: "/how-it-works" }]} />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            How it works
          </h1>
          <p className="text-neutral-600">
            From registration to your full report, here&apos;s exactly what happens.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <Card key={step.title} className="flex flex-col gap-2">
              <h2 className="text-lg font-medium text-neutral-900">{step.title}</h2>
              <p className="text-neutral-600">{step.body}</p>
            </Card>
          ))}
        </div>

        <p className="text-neutral-600">
          Have a specific question?{" "}
          <Link href="/faq" className="text-brand-600 underline">
            Check the FAQ
          </Link>{" "}
          or see the{" "}
          <Link href="/pricing" className="text-brand-600 underline">
            unlock options
          </Link>
          .
        </p>
      </main>
    </>
  );
}
