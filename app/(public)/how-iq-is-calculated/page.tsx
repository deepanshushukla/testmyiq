import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";

const TITLE = "How Your Score Is Calculated — Methodology, Transparently";
const DESCRIPTION =
  "A plain-language breakdown of exactly how our Estimated Cognitive Performance Score is calculated — weights, scoring, and why we don't show a percentile yet.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/how-iq-is-calculated",
});

export default function HowIqIsCalculatedPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/how-iq-is-calculated" })} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "How It's Calculated", path: "/how-iq-is-calculated" },
        ])}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Breadcrumbs
          items={[{ name: "Home", href: "/" }, { name: "How It's Calculated", href: "/how-iq-is-calculated" }]}
        />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            How your Estimated Cognitive Performance Score is calculated
          </h1>
          <p className="text-neutral-600">
            We call it an <strong>Estimated Cognitive Performance Score</strong>,
            not an IQ score, on purpose — it isn&apos;t clinically normed or
            professionally validated. Here is exactly what goes into the number
            you see, with nothing left vague.
          </p>
        </div>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">1. Each question has a weight</h2>
          <p className="text-neutral-600">
            Every question carries a difficulty-based weight — 1.0 for Easy,
            1.5 for Medium, 2.0 for Hard in our current question set. A correct
            answer earns its question&apos;s weight; an incorrect or unanswered
            question earns zero. We don&apos;t subtract points for a wrong
            answer — there&apos;s no established psychometric justification
            for penalizing an attempted answer more than a skipped one, so we
            don&apos;t do it.
          </p>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">2. Weighted points become a raw score</h2>
          <p className="text-neutral-600">
            Your raw score is simply the sum of the weights of every question
            you answered correctly. It has no inherent ceiling tied to a
            population average — it&apos;s a direct tally of what you got
            right, weighted by difficulty.
          </p>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">
            3. The raw score is rescaled to a 0–200 presentational range
          </h2>
          <p className="text-neutral-600">
            Your raw score is linearly rescaled onto a 0–200 scale, centered
            at 100, purely so the headline number is easy to read at a glance.
            This rescaling is <strong>not</strong> a standardized IQ
            distribution — a real IQ scale (mean 100, standard deviation 15)
            requires calibrating against a large, representative normative
            sample, which we don&apos;t have yet. Until we do, treat the
            number as a readable summary of your raw performance, not a
            population-referenced score.
          </p>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">4. A performance label, not a clinical category</h2>
          <p className="text-neutral-600">
            Your score falls into one of a few plain-language bands (for
            example, &quot;Solid&quot; or &quot;Exceptional&quot;) so the result
            is legible without decoding a raw number. These bands are
            presentational labels we define, not clinical classifications —
            we never imply a diagnosis, a certification, or a comparison to a
            validated clinical instrument.
          </p>
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-neutral-900">What we deliberately don&apos;t do (yet)</h2>
          <ul className="list-disc space-y-1 pl-5 text-neutral-600">
            <li>
              <strong>No speed bonus.</strong> Completion time is recorded and
              shown to you, but it does not change your score. Rewarding speed
              requires a documented, defensible reason (such as a validated
              speed-accuracy tradeoff model) that doesn&apos;t currently exist
              for this assessment.
            </li>
            <li>
              <strong>No percentile.</strong> Showing &quot;you scored better
              than X% of people&quot; requires a real distribution of past
              results to compare against. We don&apos;t publish one until we
              have a normative sample large and representative enough to
              support that claim honestly.
            </li>
          </ul>
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-neutral-900">Why we&apos;re explicit about this</h2>
          <p className="text-neutral-600">
            Formal intelligence testing has a long history of rigorous
            methodology — general cognitive ability as a single underlying
            factor was first formalized by Spearman (1904), later refined into
            multi-factor models such as Cattell–Horn–Carroll theory, and
            widely known non-verbal reasoning instruments like Raven&apos;s
            Progressive Matrices (Raven, 1938) are built on decades of
            standardization and norming work. We cite this only as general
            background on the field — not as evidence that our assessment
            meets the same bar. Our methodology is original, considerably
            simpler, and transparently described on this page rather than
            implied to be equivalent to a validated clinical instrument.
          </p>
          <p className="text-xs text-neutral-500">
            Sources referenced for general background: Spearman, C. (1904).
            &quot;General Intelligence,&quot; Objectively Determined and
            Measured. <em>American Journal of Psychology</em>, 15(2), 201–292.
            Cattell, R. B. (1971). <em>Abilities: Their Structure, Growth, and
            Action</em>. Raven, J. C. (1938). <em>Progressive Matrices: A
            Perceptual Test of Intelligence</em>.
          </p>
        </div>

        <p className="text-neutral-600">
          See the full step-by-step flow on{" "}
          <Link href="/how-it-works" className="text-brand-600 underline">
            how it works
          </Link>
          , or read our{" "}
          <Link href="/faq" className="text-brand-600 underline">
            FAQ
          </Link>
          .
        </p>
      </main>
    </>
  );
}
