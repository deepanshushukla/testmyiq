import { z } from "zod";

export const questionOptionInputSchema = z.object({
  label: z.string().trim().min(1).max(10),
  optionText: z.string().trim().min(1).max(500),
  isCorrect: z.boolean(),
});

export const questionKindSchema = z.enum(["STANDARD", "STIMULUS", "RECALL"]);

/**
 * STIMULUS questions are "memorize this" screens — never scored, never
 * answered with an option — so they're exempt from the options rules
 * that apply to STANDARD and RECALL questions. A RECALL question must
 * reference the STIMULUS it depends on (see docs/DEVELOPMENT_ROADMAP.md
 * Phase 5 delayed-recall note).
 */
export const questionInputSchema = z
  .object({
    questionText: z.string().trim().min(1).max(2000),
    imageUrl: z.string().trim().url().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    categorySlug: z.string().trim().min(1),
    explanation: z.string().trim().min(1).max(2000),
    expectedSolvingTimeSeconds: z.number().int().positive().max(3600),
    scoringWeight: z.number().min(0).max(10),
    kind: questionKindSchema.default("STANDARD"),
    stimulusQuestionId: z.string().uuid().optional(),
    options: z.array(questionOptionInputSchema).max(8).default([]),
  })
  .refine((data) => data.kind === "STIMULUS" || data.options.length >= 2, {
    message: "At least 2 options are required unless this is a stimulus question",
    path: ["options"],
  })
  .refine(
    (data) =>
      data.kind === "STIMULUS" || data.options.filter((option) => option.isCorrect).length === 1,
    { message: "Exactly one option must be marked correct", path: ["options"] },
  )
  .refine((data) => data.kind !== "RECALL" || Boolean(data.stimulusQuestionId), {
    message: "A recall question must reference its stimulus question",
    path: ["stimulusQuestionId"],
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

// Partial, but options (if present) must still satisfy the same rules as
// creation, scoped by the resulting kind (existing kind if not changing it).
export const questionUpdateSchema = z
  .object({
    questionText: z.string().trim().min(1).max(2000).optional(),
    imageUrl: z.string().trim().url().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    categorySlug: z.string().trim().min(1).optional(),
    explanation: z.string().trim().min(1).max(2000).optional(),
    expectedSolvingTimeSeconds: z.number().int().positive().max(3600).optional(),
    scoringWeight: z.number().min(0).max(10).optional(),
    kind: questionKindSchema.optional(),
    stimulusQuestionId: z.string().uuid().optional(),
    options: z.array(questionOptionInputSchema).max(8).optional(),
  })
  .refine(
    (data) => data.kind === "STIMULUS" || !data.options || data.options.length >= 2,
    { message: "At least 2 options are required unless this is a stimulus question", path: ["options"] },
  )
  .refine(
    (data) =>
      data.kind === "STIMULUS" ||
      !data.options ||
      data.options.filter((option) => option.isCorrect).length === 1,
    { message: "Exactly one option must be marked correct", path: ["options"] },
  );

export type QuestionUpdateInput = z.infer<typeof questionUpdateSchema>;
