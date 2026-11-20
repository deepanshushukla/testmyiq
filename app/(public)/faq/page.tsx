import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbListJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";

const TITLE = "Frequently Asked Questions";
const DESCRIPTION =
  "Answers about scoring, privacy, referrals, payment, and retaking the assessment.";

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/faq",
});

const faqs = [
  {
    question: "Is this a clinically validated IQ test?",
    answer:
      "No. We report an estimated cognitive performance score based on your accuracy and performance across different reasoning categories. Until a scientifically validated norming methodology exists, we don't call this — or present it as — a clinically or professionally validated IQ score.",
  },
  {
    question: "How is my score calculated?",
    answer:
      "Your raw score is the sum of the scoring weight of each question you answered correctly — harder questions are worth more. Unanswered and incorrect answers both score zero; we don't penalize guesses, and completion time is shown but doesn't affect your score.",
  },
  {
    question: "Is it really free?",
    answer:
      "Taking the assessment is always free. Our first 10 verified users also get their full report free. After that, unlocking your report costs $1 or two qualified referrals — whichever you prefer.",
  },
  {
    question: "How do referrals qualify?",
    answer:
      "A referral only counts once the person you invited registers using your link, verifies their email, and completes their own assessment. Registering alone doesn't count, and you can't refer yourself.",
  },
  {
    question: "Can I retake the assessment?",
    answer:
      "Retake rules are configured by the assessment settings in place at the time — check back here as the platform evolves for the current policy.",
  },
  {
    question: "What happens if I run out of time?",
    answer:
      "Your assessment is automatically submitted and scored the moment time runs out, using whatever you'd answered up to that point. The countdown is tracked on our server, not in your browser, so refreshing the page or losing your connection won't reset or extend it.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your individual answers and your score are never shown publicly unless you explicitly choose to share a result card. You control whether you appear on any leaderboard.",
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/faq" })} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "FAQ", href: "/faq" }]} />

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Frequently asked questions
          </h1>
        </div>

        <dl className="flex flex-col gap-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt>
                <h2 className="text-lg font-medium text-neutral-900">{faq.question}</h2>
              </dt>
              <dd className="mt-1 text-neutral-600">{faq.answer}</dd>
            </div>
          ))}
        </dl>

        <p className="text-neutral-600">
          Still have a question?{" "}
          <Link href="/how-it-works" className="text-brand-600 underline">
            See how it works
          </Link>{" "}
          or{" "}
          <Link href="/pricing" className="text-brand-600 underline">
            check pricing
          </Link>
          .
        </p>
      </main>
    </>
  );
}
