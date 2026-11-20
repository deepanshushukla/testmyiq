import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { UNLOCKED_STATES } from "@/lib/results/access";
import { ShareError } from "./errors";
import { generateCandidateSlug } from "./slug";
import type { CertificateVisibilitySettings } from "./types";

const MAX_GENERATION_ATTEMPTS = 5;

export type CertificateHandle = {
  publicSlug: string;
  visibilitySettings: CertificateVisibilitySettings;
};

/**
 * Ownership- and unlock-gated. Idempotent on `assessmentResultId`'s unique
 * constraint: a repeat call for the same assessment never changes the
 * `publicSlug` (a previously shared link must never break), only the
 * visibility settings. Slug collisions are retried the same way
 * `lib/referrals/code.ts` retries `ReferralCode.code` collisions.
 */
export async function getOrCreateCertificate(
  assessmentId: string,
  userId: string,
  visibilitySettings: CertificateVisibilitySettings,
): Promise<CertificateHandle> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { result: true },
  });
  if (!assessment) {
    throw new ShareError("not_found", "Assessment not found");
  }
  if (assessment.userId !== userId) {
    throw new ShareError("forbidden", "This assessment does not belong to you");
  }
  const result = assessment.result;
  if (!result || !UNLOCKED_STATES.includes(result.resultAccessState)) {
    throw new ShareError("not_unlocked", "Results must be unlocked before they can be shared");
  }

  const existing = await prisma.shareableCertificate.findUnique({
    where: { assessmentResultId: result.id },
  });
  if (existing) {
    const updated = await prisma.shareableCertificate.update({
      where: { id: existing.id },
      data: { visibilitySettings },
    });
    return {
      publicSlug: updated.publicSlug,
      visibilitySettings: updated.visibilitySettings as CertificateVisibilitySettings,
    };
  }

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const created = await prisma.shareableCertificate.create({
        data: {
          assessmentResultId: result.id,
          publicSlug: generateCandidateSlug(),
          visibilitySettings,
        },
      });
      return {
        publicSlug: created.publicSlug,
        visibilitySettings: created.visibilitySettings as CertificateVisibilitySettings,
      };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes("publicSlug")) {
        continue; // vanishingly rare with a 16-char hex slug, but retry anyway
      }
      // assessmentResultId collided — a concurrent caller already created
      // one. Return/update theirs instead of erroring.
      const createdByRace = await prisma.shareableCertificate.update({
        where: { assessmentResultId: result.id },
        data: { visibilitySettings },
      });
      return {
        publicSlug: createdByRace.publicSlug,
        visibilitySettings: createdByRace.visibilitySettings as CertificateVisibilitySettings,
      };
    }
  }

  throw new ShareError(
    "slug_generation_failed",
    "Could not generate a unique public slug after several attempts",
  );
}
