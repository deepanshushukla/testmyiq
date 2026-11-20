"use client";

import { useState } from "react";
import Link from "next/link";
import { Breadcrumbs, Button, Card } from "@/components/ui";
import type { CategoryContentEntry } from "@/lib/seo/category-content";

/**
 * Shared layout for all 5 category landing pages — the markup is
 * identical on purpose (same pattern as every other public page in this
 * app), but each page supplies genuinely distinct body copy and a
 * distinct sample question via lib/seo/category-content.ts, which is
 * what keeps these from being the "thin duplicate" pages the spec
 * prohibits (docs/SEO_STRATEGY.md §1).
 */
export function CategoryLandingPage({ content }: { content: CategoryContentEntry }) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: content.categoryName, href: `/${content.slug}` },
        ]}
      />

      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          {content.categoryName} Test
        </h1>
        {content.intro.map((paragraph) => (
          <p key={paragraph} className="text-neutral-600">
            {paragraph}
          </p>
        ))}
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-neutral-900">Why it matters</h2>
        {content.whyItMatters.map((paragraph) => (
          <p key={paragraph} className="text-neutral-600">
            {paragraph}
          </p>
        ))}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-neutral-900">Try a sample question</h2>
        <p className="text-sm text-neutral-500">
          This is an original, illustrative question — not from our scored assessment.
        </p>
        <p className="font-medium text-neutral-900">{content.sampleQuestion.prompt}</p>
        <div className="flex flex-col gap-2">
          {content.sampleQuestion.options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrect = index === content.sampleQuestion.correctIndex;
            const showResult = selected !== null;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSelected(index)}
                className={`rounded-lg border px-4 py-2 text-left text-sm transition-colors ${
                  showResult && isCorrect
                    ? "border-green-500 bg-green-50 text-green-900"
                    : showResult && isSelected
                      ? "border-red-400 bg-red-50 text-red-900"
                      : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <p className="text-sm text-neutral-600">{content.sampleQuestion.explanation}</p>
        )}
      </Card>

      <Card className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-lg font-medium text-neutral-900">
          See how you score across all 10 categories
        </h2>
        <p className="text-sm text-neutral-600">
          {content.categoryName} is one of ten categories in our full, timed cognitive
          assessment — with a detailed breakdown by category and difficulty.
        </p>
        <Link href="/register">
          <Button>Start the full assessment</Button>
        </Link>
      </Card>

      <p className="text-sm text-neutral-500">
        Explore the other categories:{" "}
        <Link href="/logical-reasoning-test" className="text-brand-600 underline">
          Logical
        </Link>
        ,{" "}
        <Link href="/abstract-reasoning-test" className="text-brand-600 underline">
          Abstract
        </Link>
        ,{" "}
        <Link href="/numerical-reasoning-test" className="text-brand-600 underline">
          Numerical
        </Link>
        ,{" "}
        <Link href="/spatial-reasoning-test" className="text-brand-600 underline">
          Spatial
        </Link>
        ,{" "}
        <Link href="/pattern-recognition-test" className="text-brand-600 underline">
          Pattern Recognition
        </Link>
        .
      </p>
    </main>
  );
}
