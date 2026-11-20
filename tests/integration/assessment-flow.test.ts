import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { getAssessmentState } from "@/lib/assessment/state";
import { submitAnswer } from "@/lib/assessment/answer";
import { submitAssessment } from "@/lib/assessment/submit";
import { AssessmentError } from "@/lib/assessment/errors";
import { seedAssessmentFixtures, createVerifiedUser } from "./helpers/assessment-fixtures";

describe("assessment engine — full flow", () => {
  beforeEach(seedAssessmentFixtures);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("starts an attempt with 30 questions and a server-set deadline", async () => {
    const user = await createVerifiedUser("flow-start@example.com");
    const assessment = await startOrResumeAssessment(user.id);

    expect(assessment.status).toBe("IN_PROGRESS");
    expect(assessment.expiresAt).not.toBeNull();

    const questionCount = await prisma.assessmentQuestion.count({
      where: { assessmentId: assessment.id },
    });
    expect(questionCount).toBe(30);
  });

  it("resumes the same attempt instead of creating a second one while IN_PROGRESS", async () => {
    const user = await createVerifiedUser("flow-resume@example.com");
    const first = await startOrResumeAssessment(user.id);
    const second = await startOrResumeAssessment(user.id);

    expect(second.id).toBe(first.id);

    const count = await prisma.assessment.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it("persists an answer and reflects it in state", async () => {
    const user = await createVerifiedUser("flow-answer@example.com");
    const assessment = await startOrResumeAssessment(user.id);
    const state = await getAssessmentState(assessment.id, user.id);
    const firstQuestion = state.questions[0];
    const chosenOption = firstQuestion.options[0];

    await submitAnswer(assessment.id, user.id, firstQuestion.assessmentQuestionId, {
      selectedOptionId: chosenOption.id,
    });

    const updated = await getAssessmentState(assessment.id, user.id);
    expect(updated.questions[0].selectedOptionId).toBe(chosenOption.id);
  });

  it("submits once, is idempotent on a second submit, and blocks further answers", async () => {
    const user = await createVerifiedUser("flow-submit@example.com");
    const assessment = await startOrResumeAssessment(user.id);

    const submitted = await submitAssessment(assessment.id, user.id);
    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.submittedAt).not.toBeNull();

    const resubmitted = await submitAssessment(assessment.id, user.id);
    expect(resubmitted.status).toBe("SUBMITTED");
    expect(resubmitted.submittedAt?.getTime()).toBe(submitted.submittedAt?.getTime());

    const state = await getAssessmentState(assessment.id, user.id);
    const anyQuestion = state.questions[0];

    await expect(
      submitAnswer(assessment.id, user.id, anyQuestion.assessmentQuestionId, {
        selectedOptionId: anyQuestion.options[0].id,
      }),
    ).rejects.toBeInstanceOf(AssessmentError);
  });

  it("starts a brand-new attempt after a previous one is submitted (retake allowed)", async () => {
    const user = await createVerifiedUser("flow-retake@example.com");
    const first = await startOrResumeAssessment(user.id);
    await submitAssessment(first.id, user.id);

    const second = await startOrResumeAssessment(user.id);
    expect(second.id).not.toBe(first.id);
    expect(second.status).toBe("IN_PROGRESS");
  });
});
