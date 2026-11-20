import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { archiveQuestion, createQuestion, publishQuestion } from "@/lib/admin/questions";
import { selectQuestions } from "@/lib/assessment/select";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { getAssessmentState } from "@/lib/assessment/state";
import { submitAnswer } from "@/lib/assessment/answer";
import { AssessmentError } from "@/lib/assessment/errors";
import {
  createVerifiedUser,
  seedAssessmentFixtures,
  seedDeterministicStimulusRecallPair,
} from "./helpers/assessment-fixtures";

const MIN_STIMULUS_GAP = 3;

describe("stimulus/recall question lifecycle", () => {
  let categorySlug: string;

  beforeEach(async () => {
    await seedAssessmentFixtures();
    categorySlug = "memory-attention";
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and publishes a STIMULUS question with no options", async () => {
    const stimulus = await createQuestion({
      questionText: "Memorize: 1 2 3",
      difficulty: "EASY",
      categorySlug,
      explanation: "Not scored.",
      expectedSolvingTimeSeconds: 15,
      scoringWeight: 0,
      kind: "STIMULUS",
      options: [],
    });

    const published = await publishQuestion(stimulus.id);
    expect(published.status).toBe("PUBLISHED");
    expect(published.options).toHaveLength(0);
  });

  it("rejects a RECALL question referencing a nonexistent stimulus", async () => {
    await expect(
      createQuestion({
        questionText: "What was the number?",
        difficulty: "EASY",
        categorySlug,
        explanation: "x",
        expectedSolvingTimeSeconds: 30,
        scoringWeight: 1,
        kind: "RECALL",
        stimulusQuestionId: "00000000-0000-0000-0000-000000000000",
        options: [
          { label: "A", optionText: "1", isCorrect: true },
          { label: "B", optionText: "2", isCorrect: false },
        ],
      }),
    ).rejects.toMatchObject({ code: "stimulus_not_found" });
  });

  it("rejects a RECALL question referencing a non-stimulus question", async () => {
    const standard = await createQuestion({
      questionText: "A standard question",
      difficulty: "EASY",
      categorySlug,
      explanation: "x",
      expectedSolvingTimeSeconds: 30,
      scoringWeight: 1,
      kind: "STANDARD",
      options: [
        { label: "A", optionText: "1", isCorrect: true },
        { label: "B", optionText: "2", isCorrect: false },
      ],
    });

    await expect(
      createQuestion({
        questionText: "What was the number?",
        difficulty: "EASY",
        categorySlug,
        explanation: "x",
        expectedSolvingTimeSeconds: 30,
        scoringWeight: 1,
        kind: "RECALL",
        stimulusQuestionId: standard.id,
        options: [
          { label: "A", optionText: "1", isCorrect: true },
          { label: "B", optionText: "2", isCorrect: false },
        ],
      }),
    ).rejects.toMatchObject({ code: "invalid_stimulus" });
  });

  it("rejects linking a second RECALL to an already-linked STIMULUS", async () => {
    const stimulus = await createQuestion({
      questionText: "Memorize: 9 8 7",
      difficulty: "EASY",
      categorySlug,
      explanation: "x",
      expectedSolvingTimeSeconds: 15,
      scoringWeight: 0,
      kind: "STIMULUS",
      options: [],
    });

    const makeRecall = () =>
      createQuestion({
        questionText: "What was the number?",
        difficulty: "EASY",
        categorySlug,
        explanation: "x",
        expectedSolvingTimeSeconds: 30,
        scoringWeight: 1,
        kind: "RECALL",
        stimulusQuestionId: stimulus.id,
        options: [
          { label: "A", optionText: "1", isCorrect: true },
          { label: "B", optionText: "2", isCorrect: false },
        ],
      });

    await makeRecall();
    await expect(makeRecall()).rejects.toMatchObject({ code: "stimulus_already_linked" });
  });

  it("blocks publishing a RECALL question until its stimulus is published", async () => {
    const stimulus = await createQuestion({
      questionText: "Memorize: 5 5 5",
      difficulty: "EASY",
      categorySlug,
      explanation: "x",
      expectedSolvingTimeSeconds: 15,
      scoringWeight: 0,
      kind: "STIMULUS",
      options: [],
    });
    // Deliberately not publishing the stimulus.

    const recall = await createQuestion({
      questionText: "What was the number?",
      difficulty: "EASY",
      categorySlug,
      explanation: "x",
      expectedSolvingTimeSeconds: 30,
      scoringWeight: 1,
      kind: "RECALL",
      stimulusQuestionId: stimulus.id,
      options: [
        { label: "A", optionText: "5", isCorrect: true },
        { label: "B", optionText: "6", isCorrect: false },
      ],
    });

    await expect(publishQuestion(recall.id)).rejects.toMatchObject({
      code: "stimulus_not_published",
    });

    await publishQuestion(stimulus.id);
    const publishedRecall = await publishQuestion(recall.id);
    expect(publishedRecall.status).toBe("PUBLISHED");
  });

  it("cascades archiving a STIMULUS to its linked RECALL", async () => {
    const stimulus = await createQuestion({
      questionText: "Memorize: 2 2 2",
      difficulty: "EASY",
      categorySlug,
      explanation: "x",
      expectedSolvingTimeSeconds: 15,
      scoringWeight: 0,
      kind: "STIMULUS",
      options: [],
    });
    await publishQuestion(stimulus.id);

    const recall = await createQuestion({
      questionText: "What was the number?",
      difficulty: "EASY",
      categorySlug,
      explanation: "x",
      expectedSolvingTimeSeconds: 30,
      scoringWeight: 1,
      kind: "RECALL",
      stimulusQuestionId: stimulus.id,
      options: [
        { label: "A", optionText: "2", isCorrect: true },
        { label: "B", optionText: "3", isCorrect: false },
      ],
    });
    await publishQuestion(recall.id);

    await archiveQuestion(stimulus.id);

    const recallRow = await prisma.question.findUniqueOrThrow({ where: { id: recall.id } });
    expect(recallRow.status).toBe("ARCHIVED");
  });
});

describe("stimulus/recall in a real attempt", () => {
  let template: Awaited<ReturnType<typeof seedAssessmentFixtures>>["template"];

  beforeEach(async () => {
    ({ template } = await seedAssessmentFixtures());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("places the stimulus before its recall with at least the minimum gap, without affecting the difficulty budget", async () => {
    const { stimulus, recall } = await seedDeterministicStimulusRecallPair("EASY");

    const selected = await selectQuestions(template);

    const stimulusIndex = selected.findIndex((q) => q.id === stimulus.id);
    const recallIndex = selected.findIndex((q) => q.id === recall.id);

    expect(stimulusIndex).toBeGreaterThanOrEqual(0);
    expect(recallIndex).toBeGreaterThan(stimulusIndex);
    expect(recallIndex - stimulusIndex).toBeGreaterThanOrEqual(MIN_STIMULUS_GAP);

    // The stimulus is pure bonus — EASY's scored count is still exactly
    // template.easyCount, unaffected by the stimulus being added.
    const scoredEasy = selected.filter((q) => q.difficulty === "EASY" && q.kind !== "STIMULUS");
    expect(scoredEasy).toHaveLength(template.easyCount);
  });

  it("serializes the stimulus with no options and the recall with real options in assessment state", async () => {
    const { stimulus, recall } = await seedDeterministicStimulusRecallPair("MEDIUM");
    const user = await createVerifiedUser("stimulus-state@example.com");
    const assessment = await startOrResumeAssessment(user.id);
    const state = await getAssessmentState(assessment.id, user.id);

    const stimulusEntry = state.questions.find((q) => q.questionText === stimulus.questionText);
    const recallEntry = state.questions.find((q) => q.questionText === recall.questionText);

    expect(stimulusEntry?.kind).toBe("STIMULUS");
    expect(stimulusEntry?.options).toHaveLength(0);
    expect(recallEntry?.kind).toBe("RECALL");
    expect(recallEntry?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects selecting an option on a stimulus question", async () => {
    const { stimulus } = await seedDeterministicStimulusRecallPair("HARD");
    const user = await createVerifiedUser("stimulus-answer@example.com");
    const assessment = await startOrResumeAssessment(user.id);
    const state = await getAssessmentState(assessment.id, user.id);

    const stimulusEntry = state.questions.find((q) => q.questionText === stimulus.questionText);
    expect(stimulusEntry).toBeDefined();

    await expect(
      submitAnswer(assessment.id, user.id, stimulusEntry!.assessmentQuestionId, {
        selectedOptionId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toBeInstanceOf(AssessmentError);
  });
});
