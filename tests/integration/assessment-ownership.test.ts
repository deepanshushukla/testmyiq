import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { getAssessmentState } from "@/lib/assessment/state";
import { submitAnswer } from "@/lib/assessment/answer";
import { submitAssessment } from "@/lib/assessment/submit";
import { AssessmentError } from "@/lib/assessment/errors";
import { seedAssessmentFixtures, createVerifiedUser } from "./helpers/assessment-fixtures";

describe("assessment ownership", () => {
  beforeEach(seedAssessmentFixtures);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("refuses state, answer, and submit for a user who doesn't own the attempt", async () => {
    const owner = await createVerifiedUser("owner@example.com");
    const intruder = await createVerifiedUser("intruder@example.com");
    const assessment = await startOrResumeAssessment(owner.id);

    await expect(getAssessmentState(assessment.id, intruder.id)).rejects.toMatchObject({
      code: "forbidden",
    });

    const ownerState = await getAssessmentState(assessment.id, owner.id);
    const question = ownerState.questions[0];

    await expect(
      submitAnswer(assessment.id, intruder.id, question.assessmentQuestionId, {
        selectedOptionId: question.options[0].id,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(submitAssessment(assessment.id, intruder.id)).rejects.toMatchObject({
      code: "forbidden",
    });

    // None of the intruder's attempts should have changed anything.
    const unchanged = await prisma.assessment.findUniqueOrThrow({ where: { id: assessment.id } });
    expect(unchanged.status).toBe("IN_PROGRESS");
  });

  it("returns not_found for a nonexistent attempt id", async () => {
    const user = await createVerifiedUser("solo@example.com");

    await expect(
      getAssessmentState("00000000-0000-0000-0000-000000000000", user.id),
    ).rejects.toBeInstanceOf(AssessmentError);
  });
});
