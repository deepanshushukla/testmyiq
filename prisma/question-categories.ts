/**
 * The 10 cognitive categories from requirement.txt Part 3. Seeded once;
 * referenced by slug from prisma/seed-questions.ts and the admin UI.
 */
export const QUESTION_CATEGORIES = [
  { name: "Logical Reasoning", slug: "logical-reasoning" },
  { name: "Numerical Reasoning", slug: "numerical-reasoning" },
  { name: "Abstract Reasoning", slug: "abstract-reasoning" },
  { name: "Spatial Reasoning", slug: "spatial-reasoning" },
  { name: "Pattern Recognition", slug: "pattern-recognition" },
  { name: "Matrix Reasoning", slug: "matrix-reasoning" },
  { name: "Deductive Reasoning", slug: "deductive-reasoning" },
  { name: "Visual Reasoning", slug: "visual-reasoning" },
  { name: "Sequence Completion", slug: "sequence-completion" },
  { name: "Memory and Attention", slug: "memory-attention" },
];
