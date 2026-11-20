import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button, Card } from "@/components/ui";
import { JsonLd } from "@/components/seo/JsonLd";
import { webPageJsonLd } from "@/lib/seo/json-ld";
import { APP_NAME } from "@/lib/seo/constants";
import { getPublicCertificateCard } from "@/lib/sharing/public-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}): Promise<Metadata> {
  const { publicSlug } = await params;
  const card = await getPublicCertificateCard(publicSlug);
  if (!card) {
    return { title: "Share card not found", robots: { index: false, follow: false } };
  }

  const title = `${card.displayName}'s Cognitive Assessment Results`;
  const description = card.estimatedScore
    ? `${card.displayName} earned an estimated cognitive performance score of ${Math.round(card.estimatedScore)} (${card.performanceLabel}) on ${APP_NAME}. Take the assessment yourself.`
    : `${card.displayName} completed a cognitive assessment on ${APP_NAME}. Take the assessment yourself.`;

  return {
    title,
    description,
    alternates: { canonical: `/u/${publicSlug}` },
    robots: { index: card.indexable, follow: true },
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

type CategoryBreakdown = Record<string, { correct: number; total: number }>;

export default async function PublicCertificatePage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  const card = await getPublicCertificateCard(publicSlug);
  if (!card) {
    notFound();
  }

  const categoryBreakdown = card.categoryBreakdown as CategoryBreakdown | undefined;

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          title: `${card.displayName}'s Cognitive Assessment Results`,
          description: `Public results card shared from ${APP_NAME}.`,
          path: `/u/${publicSlug}`,
        })}
      />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            {card.displayName}&apos;s cognitive assessment
          </p>
          {card.estimatedScore !== undefined ? (
            <>
              <p className="text-5xl font-semibold text-brand-600">
                {Math.round(card.estimatedScore)}
              </p>
              <p className="text-lg text-neutral-700">{card.performanceLabel}</p>
            </>
          ) : (
            <p className="text-lg text-neutral-700">Completed a cognitive assessment</p>
          )}
          <p className="max-w-md text-xs text-neutral-500">
            This is an estimated cognitive performance score, not a clinically or
            professionally validated IQ score.
          </p>
        </Card>

        {categoryBreakdown && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-base font-medium text-neutral-900">Performance by category</h2>
            {Object.entries(categoryBreakdown).map(([categoryId, stats]) => (
              <div key={categoryId} className="flex justify-between text-sm text-neutral-600">
                <span>{categoryId}</span>
                <span>
                  {stats.correct}/{stats.total}
                </span>
              </div>
            ))}
          </Card>
        )}

        {card.badges && card.badges.length > 0 && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-base font-medium text-neutral-900">Badges earned</h2>
            <ul className="flex flex-wrap gap-2 text-sm text-neutral-700">
              {card.badges.map((badge) => (
                <li
                  key={badge.code}
                  className="rounded-full bg-brand-50 px-3 py-1 text-brand-700"
                  title={badge.description}
                >
                  {badge.name}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-base font-medium text-neutral-900">
            Think you can match {card.displayName}?
          </h2>
          <Link href="/register">
            <Button>Take the assessment</Button>
          </Link>
        </Card>
      </main>
    </>
  );
}
