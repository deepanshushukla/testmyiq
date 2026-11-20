import { prisma } from "@/lib/db/client";
import { getPerformanceLabel } from "@/lib/scoring/bands";
import { getGamificationSummary } from "@/lib/gamification/summary";
import type { CertificateVisibilitySettings } from "./types";

export type PublicCertificateCard = {
  displayName: string;
  indexable: boolean;
  // Each of these is present only when the owner opted in — absent, not
  // false/null, so JSON.stringify drops it entirely rather than hiding it
  // client-side (same whitelist principle as lib/results/access.ts's
  // locked payload).
  estimatedScore?: number;
  performanceLabel?: string;
  categoryBreakdown?: unknown;
  badges?: { code: string; name: string; description: string; earnedAt: string }[];
};

/** Public, unauthenticated read. Returns null on an unknown slug — callers
 * decide the 404. Visibility is enforced here, server-side, field by
 * field — never by trusting a flag the client already fetched. */
export async function getPublicCertificateCard(
  publicSlug: string,
): Promise<PublicCertificateCard | null> {
  const certificate = await prisma.shareableCertificate.findUnique({
    where: { publicSlug },
    include: {
      assessmentResult: {
        include: { assessment: { include: { user: true } } },
      },
    },
  });
  if (!certificate) {
    return null;
  }

  const settings = certificate.visibilitySettings as CertificateVisibilitySettings;
  const result = certificate.assessmentResult;
  const user = result.assessment.user;

  const card: PublicCertificateCard = {
    displayName: user.displayName ?? `Player ${user.id.slice(0, 6)}`,
    indexable: settings.indexable,
  };

  if (settings.showScore) {
    const estimatedScore = Number(result.estimatedScore);
    card.estimatedScore = estimatedScore;
    card.performanceLabel = getPerformanceLabel(estimatedScore);
  }

  if (settings.showCategoryBreakdown) {
    card.categoryBreakdown = result.categoryBreakdown;
  }

  if (settings.showBadges) {
    const summary = await getGamificationSummary(user.id);
    card.badges = summary.badges;
  }

  return card;
}
