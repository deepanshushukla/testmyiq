import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { getAssessmentState } from "@/lib/assessment/state";
import { submitAnswer } from "@/lib/assessment/answer";
import { submitAssessment } from "@/lib/assessment/submit";
import { seedAssessmentFixtures, createVerifiedUser } from "./helpers/assessment-fixtures";

async function expireAssessment(assessmentId: string) {
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
}

describe("server-authoritative timer", () => {
  beforeEach(seedAssessmentFixtures);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects an answer submitted after the deadline and auto-finalizes the assessment as EXPIRED", async () => {
    const user = await createVerifiedUser("timer-answer@example.com");
    const assessment = await startOrResumeAssessment(user.id);
    await expireAssessment(assessment.id);

    const state = await getAssessmentState(assessment.id, user.id);
    const question = state.questions[0];

    await expect(
      submitAnswer(assessment.id, user.id, question.assessmentQuestionId, {
        selectedOptionId: question.options[0].id,
      }),
    ).rejects.toMatchObject({ code: "expired" });

    const row = await prisma.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
    expect(row.status).toBe("EXPIRED");
  });

  it("reports EXPIRED from state the first time anyone looks at an expired attempt", async () => {
    const user = await createVerifiedUser("timer-state@example.com");
    const assessment = await startOrResumeAssessment(user.id);
    await expireAssessment(assessment.id);

    const state = await getAssessmentState(assessment.id, user.id);
    expect(state.status).toBe("EXPIRED");
  });

  it("an explicit user submit on an already-expired attempt stays EXPIRED, not SUBMITTED", async () => {
    const user = await createVerifiedUser("timer-submit-race@example.com");
    const assessment = await startOrResumeAssessment(user.id);
    await expireAssessment(assessment.id);

    // The client's own submit click can race the expiry by a hair —
    // the server's lazy auto-finalize wins, and the status stays EXPIRED
    // rather than flipping to SUBMITTED underneath it.
    const result = await submitAssessment(assessment.id, user.id);
    expect(result.status).toBe("EXPIRED");
  });

  it("refreshing (re-fetching state) never changes expiresAt", async () => {
    const user = await createVerifiedUser("timer-resume@example.com");
    const assessment = await startOrResumeAssessment(user.id);

    const firstState = await getAssessmentState(assessment.id, user.id);
    const secondState = await getAssessmentState(assessment.id, user.id);

    expect(secondState.expiresAt?.getTime()).toBe(firstState.expiresAt?.getTime());
  });

  it("does not auto-finalize an attempt that still has time left", async () => {
    const user = await createVerifiedUser("timer-not-expired@example.com");
    const assessment = await startOrResumeAssessment(user.id);

    const state = await getAssessmentState(assessment.id, user.id);
    expect(state.status).toBe("IN_PROGRESS");
  });
});
