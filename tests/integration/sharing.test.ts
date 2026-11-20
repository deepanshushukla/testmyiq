import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getOrCreateCertificate } from "@/lib/sharing/certificate";
import { getPublicCertificateCard } from "@/lib/sharing/public-card";
import { ShareError } from "@/lib/sharing/errors";
import { buildPreUnlockShareText, buildUnlockedShareText } from "@/lib/sharing/copy";
import { createVerifiedUser, seedAssessmentFixtures, startAndSubmitAssessment } from "./helpers/assessment-fixtures";

const ALL_VISIBLE = {
  showScore: true,
  showCategoryBreakdown: true,
  showBadges: true,
  indexable: true,
};

const ALL_HIDDEN = {
  showScore: false,
  showCategoryBreakdown: false,
  showBadges: false,
  indexable: false,
};

describe("lib/sharing", () => {
  beforeEach(seedAssessmentFixtures);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("getOrCreateCertificate", () => {
    it("refuses an assessment that belongs to a different user", async () => {
      const owner = await createVerifiedUser("cert-owner@example.com", true);
      const intruder = await createVerifiedUser("cert-intruder@example.com", true);
      const assessment = await startAndSubmitAssessment(owner.id, "all-correct");

      await expect(
        getOrCreateCertificate(assessment.id, intruder.id, ALL_VISIBLE),
      ).rejects.toMatchObject({ code: "forbidden" });
    });

    it("refuses a nonexistent assessment", async () => {
      const user = await createVerifiedUser("cert-missing@example.com", true);
      await expect(
        getOrCreateCertificate("00000000-0000-0000-0000-000000000000", user.id, ALL_VISIBLE),
      ).rejects.toMatchObject({ code: "not_found" });
    });

    it("refuses a LOCKED (not-yet-unlocked) result", async () => {
      const user = await createVerifiedUser("cert-locked@example.com", false);
      const assessment = await startAndSubmitAssessment(user.id, "all-correct");

      await expect(
        getOrCreateCertificate(assessment.id, user.id, ALL_VISIBLE),
      ).rejects.toMatchObject({ code: "not_unlocked" });
    });

    it("creates a certificate with a stable slug that never changes across repeat calls", async () => {
      const user = await createVerifiedUser("cert-create@example.com", true);
      const assessment = await startAndSubmitAssessment(user.id, "all-correct");

      const first = await getOrCreateCertificate(assessment.id, user.id, ALL_VISIBLE);
      expect(first.publicSlug).toHaveLength(16);

      const second = await getOrCreateCertificate(assessment.id, user.id, ALL_HIDDEN);
      expect(second.publicSlug).toBe(first.publicSlug);
      expect(second.visibilitySettings).toEqual(ALL_HIDDEN);

      const rows = await prisma.shareableCertificate.findMany({
        where: { assessmentResult: { assessmentId: assessment.id } },
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe("getPublicCertificateCard", () => {
    it("returns null for an unknown slug", async () => {
      expect(await getPublicCertificateCard("does-not-exist")).toBeNull();
    });

    it("omits score fields entirely when showScore is false", async () => {
      const user = await createVerifiedUser("card-no-score@example.com", true);
      const assessment = await startAndSubmitAssessment(user.id, "all-correct");
      const { publicSlug } = await getOrCreateCertificate(assessment.id, user.id, {
        ...ALL_VISIBLE,
        showScore: false,
      });

      const card = await getPublicCertificateCard(publicSlug);
      const json = JSON.stringify(card);
      expect(json).not.toContain("estimatedScore");
      expect(json).not.toContain("performanceLabel");
    });

    it("omits categoryBreakdown entirely when showCategoryBreakdown is false", async () => {
      const user = await createVerifiedUser("card-no-breakdown@example.com", true);
      const assessment = await startAndSubmitAssessment(user.id, "all-correct");
      const { publicSlug } = await getOrCreateCertificate(assessment.id, user.id, {
        ...ALL_VISIBLE,
        showCategoryBreakdown: false,
      });

      const json = JSON.stringify(await getPublicCertificateCard(publicSlug));
      expect(json).not.toContain("categoryBreakdown");
    });

    it("omits badges entirely when showBadges is false", async () => {
      const user = await createVerifiedUser("card-no-badges@example.com", true);
      const assessment = await startAndSubmitAssessment(user.id, "all-correct");
      const { publicSlug } = await getOrCreateCertificate(assessment.id, user.id, {
        ...ALL_VISIBLE,
        showBadges: false,
      });

      const json = JSON.stringify(await getPublicCertificateCard(publicSlug));
      expect(json).not.toContain("badges");
    });

    it("includes every field, correctly populated, when fully opted in", async () => {
      const user = await createVerifiedUser("card-all@example.com", true);
      const assessment = await startAndSubmitAssessment(user.id, "all-correct");
      const { publicSlug } = await getOrCreateCertificate(assessment.id, user.id, ALL_VISIBLE);

      const card = await getPublicCertificateCard(publicSlug);
      expect(card?.indexable).toBe(true);
      expect(card?.estimatedScore).toBe(200);
      expect(card?.performanceLabel).toBe("Exceptional");
      expect(card?.categoryBreakdown).toBeDefined();
      expect(card?.badges?.length).toBeGreaterThan(0);
    });

    it("reflects a hidden result as false, not absent", async () => {
      const user = await createVerifiedUser("card-indexable@example.com", true);
      const assessment = await startAndSubmitAssessment(user.id, "all-correct");
      const { publicSlug } = await getOrCreateCertificate(assessment.id, user.id, ALL_HIDDEN);

      const card = await getPublicCertificateCard(publicSlug);
      expect(card?.indexable).toBe(false);
    });
  });

  describe("share copy", () => {
    it("the pre-unlock invitation never contains a numeric score", () => {
      const text = buildPreUnlockShareText();
      expect(text).not.toMatch(/\d/);
    });

    it("the post-unlock share copy is also score-free text (the public page gates the number)", () => {
      const text = buildUnlockedShareText();
      expect(text).not.toMatch(/\d/);
    });
  });
});

describe("ShareError", () => {
  it("carries a code distinct from its message", () => {
    const error = new ShareError("forbidden", "nope");
    expect(error.code).toBe("forbidden");
    expect(error.name).toBe("ShareError");
  });
});
