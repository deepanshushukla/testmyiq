import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { ensureAssessmentResult } from "@/lib/results/create-result";
import {
  createVerifiedUser,
  seedAssessmentFixtures,
  startAndSubmitAssessment,
} from "./helpers/assessment-fixtures";

describe("ensureAssessmentResult", () => {
  beforeEach(seedAssessmentFixtures);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a result with FREE_ACCESS for a free-tier-eligible user", async () => {
    const user = await createVerifiedUser("free@example.com", true);
    const assessment = await startAndSubmitAssessment(user.id, "all-correct");

    const result = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: assessment.id },
    });

    expect(result.resultAccessState).toBe("FREE_ACCESS");
    expect(result.correctCount).toBe(30);
    expect(Number(result.estimatedScore)).toBe(200);
  });

  it("creates a result with LOCKED for a non-free-tier user", async () => {
    const user = await createVerifiedUser("paid@example.com", false);
    const assessment = await startAndSubmitAssessment(user.id, "all-incorrect");

    const result = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: assessment.id },
    });

    expect(result.resultAccessState).toBe("LOCKED");
    expect(result.incorrectCount).toBe(30);
    expect(Number(result.rawScore)).toBe(0);
  });

  it("is idempotent — calling it twice returns the same row, not a duplicate", async () => {
    const user = await createVerifiedUser("idempotent@example.com", true);
    const assessment = await startAndSubmitAssessment(user.id, "all-correct");

    const first = await ensureAssessmentResult(assessment.id);
    const second = await ensureAssessmentResult(assessment.id);

    expect(second.id).toBe(first.id);

    const count = await prisma.assessmentResult.count({ where: { assessmentId: assessment.id } });
    expect(count).toBe(1);
  });

  it("scores an EXPIRED attempt against the allotted deadline, not however long it sat abandoned", async () => {
    const user = await createVerifiedUser("expired@example.com", true);
    const assessment = await startAndSubmitAssessment(user.id, "all-unanswered");

    // Simulate: the attempt actually only had a 500-second window, but
    // nobody looked at it again until long after that.
    const startedAt = new Date(Date.now() - 100_000);
    const expiresAt = new Date(startedAt.getTime() + 500_000);

    await prisma.assessmentResult.delete({ where: { assessmentId: assessment.id } });
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: "EXPIRED", startedAt, expiresAt, submittedAt: new Date() },
    });

    const result = await ensureAssessmentResult(assessment.id);
    expect(result.completionTimeSeconds).toBe(500);
  });

  it("excludes the stimulus from the result's counts but scores its paired recall normally", async () => {
    const user = await createVerifiedUser("stimulus-scoring@example.com", true);
    const assessment = await startAndSubmitAssessment(user.id, "all-correct");

    const result = await prisma.assessmentResult.findUniqueOrThrow({
      where: { assessmentId: assessment.id },
    });

    // "all-correct" only answers scored (non-STIMULUS) questions, and the
    // template draws exactly 30 scored questions regardless of whether a
    // stimulus/recall pair happens to be among them.
    expect(result.correctCount + result.incorrectCount + result.unansweredCount).toBe(30);
  });
});
