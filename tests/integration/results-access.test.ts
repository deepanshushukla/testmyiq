import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getResultForUser } from "@/lib/results/access";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { AssessmentError } from "@/lib/assessment/errors";
import {
  createVerifiedUser,
  seedAssessmentFixtures,
  startAndSubmitAssessment,
} from "./helpers/assessment-fixtures";

const SCORE_FIELD_NAMES = [
  "rawScore",
  "estimatedScore",
  "accuracyPercentage",
  "correctCount",
  "incorrectCount",
  "difficultyBreakdown",
  "categoryBreakdown",
];

describe("getResultForUser", () => {
  beforeEach(seedAssessmentFixtures);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("never leaks any score field for a LOCKED result, anywhere in the response", async () => {
    const user = await createVerifiedUser("locked-view@example.com", false);
    const assessment = await startAndSubmitAssessment(user.id, "all-correct");

    const result = await getResultForUser(assessment.id, user.id);
    expect(result.status).toBe("locked");

    const json = JSON.stringify(result);
    for (const field of SCORE_FIELD_NAMES) {
      expect(json).not.toContain(field);
    }
  });

  it("exposes only completion confirmation, questions attempted, and time taken when locked", async () => {
    const user = await createVerifiedUser("locked-fields@example.com", false);
    const assessment = await startAndSubmitAssessment(user.id, "all-correct");

    const result = await getResultForUser(assessment.id, user.id);
    expect(result.status).toBe("locked");
    if (result.status === "locked") {
      expect(result.questionsAttempted).toBe(30);
      expect(result.completionTimeSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns the full breakdown for an unlocked (FREE_ACCESS) result", async () => {
    const user = await createVerifiedUser("unlocked-view@example.com", true);
    const assessment = await startAndSubmitAssessment(user.id, "all-correct");

    const result = await getResultForUser(assessment.id, user.id);
    expect(result.status).toBe("unlocked");
    if (result.status === "unlocked") {
      expect(result.correctCount).toBe(30);
      expect(result.estimatedScore).toBe(200);
      expect(result.performanceLabel).toBe("Exceptional");
    }
  });

  it("sets RESULT_VIEWED on first view and leaves it unchanged on subsequent views", async () => {
    const user = await createVerifiedUser("first-view@example.com", true);
    const assessment = await startAndSubmitAssessment(user.id, "all-correct");

    const beforeView = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: assessment.id },
    });
    expect(beforeView.resultAccessState).toBe("FREE_ACCESS");
    expect(beforeView.resultViewedAt).toBeNull();

    await getResultForUser(assessment.id, user.id);

    const afterFirstView = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: assessment.id },
    });
    expect(afterFirstView.resultAccessState).toBe("RESULT_VIEWED");
    expect(afterFirstView.resultViewedAt).not.toBeNull();

    await getResultForUser(assessment.id, user.id);
    const afterSecondView = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: assessment.id },
    });
    expect(afterSecondView.resultViewedAt?.getTime()).toBe(afterFirstView.resultViewedAt?.getTime());
  });

  it("refuses access to a result that belongs to a different user", async () => {
    const owner = await createVerifiedUser("result-owner@example.com", true);
    const intruder = await createVerifiedUser("result-intruder@example.com", true);
    const assessment = await startAndSubmitAssessment(owner.id, "all-correct");

    await expect(getResultForUser(assessment.id, intruder.id)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("refuses to show results for an assessment still in progress", async () => {
    const user = await createVerifiedUser("in-progress@example.com", true);
    const assessment = await startOrResumeAssessment(user.id);

    await expect(getResultForUser(assessment.id, user.id)).rejects.toBeInstanceOf(AssessmentError);
    await expect(getResultForUser(assessment.id, user.id)).rejects.toMatchObject({
      code: "not_submitted",
    });
  });
});
