/**
 * One entry per category landing page (requirement.txt Part 10's exact
 * 5-page list). Each `sampleQuestion` is original and hardcoded here —
 * never pulled from the real question bank, which would leak an answer
 * via page source (docs/SEO_STRATEGY.md §1).
 */
export type SampleQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type CategoryContentEntry = {
  slug: string;
  categoryName: string;
  title: string;
  description: string;
  intro: string[];
  whyItMatters: string[];
  sampleQuestion: SampleQuestion;
};

export const CATEGORY_CONTENT: CategoryContentEntry[] = [
  {
    slug: "logical-reasoning-test",
    categoryName: "Logical Reasoning",
    title: "Logical Reasoning Test — Practice Deduction & If-Then Puzzles",
    description:
      "Take a free logical reasoning test and learn how deductive puzzles are scored. See a sample question and start the full cognitive assessment.",
    intro: [
      "Logical reasoning questions test how well you draw a valid conclusion from a set of statements, without relying on outside knowledge. The classic form is a syllogism — two or more premises followed by a conclusion that must be true if the premises are true — but modern tests also use conditional (\"if X, then Y\") chains and simple logic grids.",
      "What makes these questions tricky isn't the vocabulary, it's resisting the pull of real-world plausibility. A premise can be false in reality and the logic still perfectly valid, or true in reality and the argument still invalid. The skill being measured is pure deduction, not general knowledge.",
    ],
    whyItMatters: [
      "Logical reasoning is one of the ten categories in our full cognitive assessment, alongside numerical, abstract, spatial, and pattern-recognition reasoning. It correlates strongly with the kind of structured thinking used in debugging code, reading contracts, and following multi-step instructions correctly the first time.",
    ],
    sampleQuestion: {
      prompt:
        "All the lamps in the workshop are either on the workbench or on the shelf. Every lamp on the shelf is unplugged. Nia's lamp is plugged in. Where is Nia's lamp?",
      options: [
        "On the shelf",
        "On the workbench",
        "Neither — it must be somewhere else",
        "Cannot be determined",
      ],
      correctIndex: 1,
      explanation:
        "Every lamp is on the workbench or the shelf (no third option exists). Every shelf lamp is unplugged, but Nia's lamp is plugged in, so it cannot be on the shelf. By elimination, it must be on the workbench.",
    },
  },
  {
    slug: "abstract-reasoning-test",
    categoryName: "Abstract Reasoning",
    title: "Abstract Reasoning Test — Practice Non-Verbal Transformation Puzzles",
    description:
      "Practice abstract reasoning with a free sample puzzle and see how non-verbal pattern transformation is scored in our full cognitive assessment.",
    intro: [
      "Abstract reasoning questions remove language and numbers from the picture entirely. Instead, you're shown a set of shapes, lines, or symbols that change according to a hidden rule — rotation, reflection, addition of an element, color inversion — and asked to apply the same rule to a new figure.",
      "Because there's no vocabulary or cultural context to lean on, abstract reasoning is often used as one of the more \"culture-fair\" measures of reasoning ability: the only input is the visual pattern itself.",
    ],
    whyItMatters: [
      "This category measures your ability to infer a rule from limited examples and apply it correctly to something you haven't seen before — a skill that shows up anywhere you have to generalize from a few examples, from learning a new UI convention to picking up an unfamiliar notation in a textbook.",
    ],
    sampleQuestion: {
      prompt:
        "A square becomes a square with one corner cut off. A triangle becomes a triangle with one corner cut off. Following the same rule, what does a pentagon become?",
      options: [
        "A pentagon with one corner cut off",
        "A hexagon",
        "A square",
        "A pentagon rotated 90 degrees",
      ],
      correctIndex: 0,
      explanation:
        "The rule applied to every shape is identical regardless of its type: cut off exactly one corner. Applying that same rule to a pentagon simply produces a pentagon with one corner cut off — the rule doesn't change the shape's identity, only trims one vertex.",
    },
  },
  {
    slug: "numerical-reasoning-test",
    categoryName: "Numerical Reasoning",
    title: "Numerical Reasoning Test — Practice Number Sequences & Ratios",
    description:
      "Try a free numerical reasoning practice question covering number sequences and ratios, then take the full timed cognitive assessment.",
    intro: [
      "Numerical reasoning covers more than arithmetic speed. You'll see number sequences with a hidden rule (arithmetic, geometric, or a mix of two interleaved patterns), word problems involving ratios and rates, and questions that ask you to spot the relationship between two sets of numbers.",
      "The goal isn't to test whether you can multiply quickly in your head — it's whether you can identify the underlying relationship between numbers and extend it correctly, which matters more than raw calculation speed once you're past basic arithmetic.",
    ],
    whyItMatters: [
      "Numerical reasoning is the category most directly tied to everyday quantitative decisions — comparing prices per unit, reading a chart correctly, or noticing that a growth rate has quietly changed. Our assessment weighs it alongside nine other categories so no single skill dominates your overall score.",
    ],
    sampleQuestion: {
      prompt: "What number comes next in the sequence: 3, 6, 11, 18, 27, ?",
      options: ["36", "37", "38", "40"],
      correctIndex: 2,
      explanation:
        "The differences between consecutive terms are 3, 5, 7, 9 — each one 2 more than the last (an arithmetic sequence of differences). The next difference is 11, and 27 + 11 = 38.",
    },
  },
  {
    slug: "spatial-reasoning-test",
    categoryName: "Spatial Reasoning",
    title: "Spatial Reasoning Test — Practice Mental Rotation Puzzles",
    description:
      "Practice spatial reasoning with a free mental-rotation sample question and see how 3D visualization is measured in our cognitive assessment.",
    intro: [
      "Spatial reasoning questions ask you to manipulate an object in your mind — rotating it, folding it, or imagining it from a different angle — without physically moving anything. A common format shows a 3D object and asks which of several rotated versions is actually the same object, versus a mirror image that only looks similar.",
      "This is a genuinely different skill from verbal or numerical reasoning: some people solve these almost instantly by visualizing the rotation, while others need to work through it more methodically by tracking individual features (a notch, a colored face) across the rotation.",
    ],
    whyItMatters: [
      "Spatial reasoning underlies fields like engineering, architecture, surgery, and packing a moving truck efficiently — any task where you need an accurate mental model of three-dimensional space. It's one of ten categories in the full assessment, each isolated in its own breakdown so you can see exactly where your strengths lie.",
    ],
    sampleQuestion: {
      prompt:
        "A cube has a red dot on its top face and a blue dot on the face directly facing you. If you rotate the cube 90 degrees to the right (around the vertical axis), which face does the blue dot end up on?",
      options: ["The top face", "The face now facing you", "The left face", "The right face"],
      correctIndex: 3,
      explanation:
        "Viewed from above, rotating 90 degrees to the right is a clockwise turn: the front face swings to where the right face was, the right face swings to the back, and so on. The face that was pointing at you — carrying the blue dot — becomes the new right face.",
    },
  },
  {
    slug: "pattern-recognition-test",
    categoryName: "Pattern Recognition",
    title: "Pattern Recognition Test — Practice Matrix & Sequence Puzzles",
    description:
      "Try a free pattern recognition sample puzzle (matrix-style) and learn how this category is scored in our full cognitive assessment.",
    intro: [
      "Pattern recognition questions present a grid or sequence with one piece missing and ask you to identify what belongs there, based on rules that repeat across rows, columns, or steps in a sequence — rules like alternating shapes, increasing counts, or rotating orientations.",
      "Unlike abstract reasoning (which usually tests a single transformation rule), pattern-recognition items often combine two or three rules at once — for example, shape changes across one direction of a grid while shading changes across the other — so you have to track more than one pattern simultaneously.",
    ],
    whyItMatters: [
      "This is the category most people associate with classic IQ-style matrix puzzles. It measures how quickly you can detect structure in what looks, at first glance, like a jumble of shapes — a skill that transfers directly to spotting bugs in repeating code, reading spreadsheets, and noticing when a trend breaks.",
    ],
    sampleQuestion: {
      prompt:
        "Row 1: circle, square, triangle. Row 2: square, triangle, circle. Row 3: triangle, circle, ?. What belongs in place of the question mark?",
      options: ["Circle", "Square", "Triangle", "A new shape"],
      correctIndex: 1,
      explanation:
        "Each row is the previous row shifted one position to the left, wrapping around. Row 3 starts with \"triangle, circle,\" which is row 2 shifted again — following the same cyclic shift, the third item must be \"square\" to complete the pattern (triangle, circle, square).",
    },
  },
];
