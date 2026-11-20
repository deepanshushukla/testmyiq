import type { QuestionInput } from "@/lib/admin/schemas";
import { TIME_BY_DIFFICULTY, WEIGHT_BY_DIFFICULTY } from "./question-timing";

/**
 * Question bank — 9 original questions (3 per difficulty) for each of the
 * 10 categories, 90 total, 30 per difficulty. Sized deliberately above the
 * active template's per-attempt need (10 per difficulty) so
 * lib/assessment/select.ts's random draw has real room to vary — with
 * exactly 10 available per difficulty (the original 30-question batch),
 * every attempt and every retake pulled the identical set, just reordered,
 * which isn't real randomness. At 30 available per difficulty, each
 * attempt draws a different 10-of-30 combination. Ramping toward the
 * 300-question target continues across later content work
 * (docs/DEVELOPMENT_ROADMAP.md Phase 4/5 notes) — this is a real, reviewed
 * set, not placeholder/mock content.
 */

type Draft = {
  categorySlug: string;
  difficulty: QuestionInput["difficulty"];
  questionText: string;
  explanation: string;
  options: { label: string; optionText: string; isCorrect: boolean }[];
};

function opts(correctIndex: number, texts: string[]) {
  const labels = ["A", "B", "C", "D"];
  return texts.map((text, index) => ({
    label: labels[index],
    optionText: text,
    isCorrect: index === correctIndex,
  }));
}

const coreDrafts: Draft[] = [
  // Logical reasoning
  {
    categorySlug: "logical-reasoning",
    difficulty: "EASY",
    questionText: "If all Zorbs are Figgs, and all Figgs are Wibbles, which statement must be true?",
    explanation: "Transitivity: all A are B, all B are C, therefore all A are C.",
    options: opts(0, ["All Zorbs are Wibbles", "All Wibbles are Zorbs", "No Zorbs are Wibbles", "Some Figgs are not Wibbles"]),
  },
  {
    categorySlug: "logical-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "Every student who passed the exam studied at least 3 hours. Maria did not study at least 3 hours. What can you conclude?",
    explanation: "Contrapositive of 'passed implies studied >= 3 hours' is 'studied < 3 hours implies did not pass'.",
    options: opts(1, ["Maria passed the exam", "Maria did not pass the exam", "Maria studied exactly 3 hours", "Nothing can be concluded"]),
  },
  {
    categorySlug: "logical-reasoning",
    difficulty: "HARD",
    questionText:
      "Everyone who owns a cat also owns a dog. No one who owns a dog owns a bird. Priya owns a bird. What must be true about Priya?",
    explanation:
      "Owning a dog implies not owning a bird, so owning a bird implies not owning a dog (contrapositive). Owning a cat implies owning a dog, so not owning a dog implies not owning a cat.",
    options: opts(2, ["Priya owns a dog", "Priya owns a cat", "Priya does not own a cat", "Priya owns a bird and a dog"]),
  },

  // Numerical reasoning
  {
    categorySlug: "numerical-reasoning",
    difficulty: "EASY",
    questionText: "What is 15% of 200?",
    explanation: "200 × 0.15 = 30.",
    options: opts(1, ["20", "30", "25", "35"]),
  },
  {
    categorySlug: "numerical-reasoning",
    difficulty: "MEDIUM",
    questionText: "A shirt costs $40 after a 20% discount. What was the original price?",
    explanation: "40 is 80% of the original price, so the original price is 40 / 0.8 = 50.",
    options: opts(1, ["$48", "$50", "$52", "$45"]),
  },
  {
    categorySlug: "numerical-reasoning",
    difficulty: "HARD",
    questionText:
      "A tank is filled by pipe A in 6 hours and drained by pipe B in 10 hours. If both pipes are open, how many hours does it take to fill the tank?",
    explanation: "Combined rate = 1/6 - 1/10 = 1/15 of the tank per hour, so it takes 15 hours.",
    options: opts(0, ["15", "8", "16", "12"]),
  },

  // Abstract reasoning
  {
    categorySlug: "abstract-reasoning",
    difficulty: "EASY",
    questionText: "Bird is to Nest as Bee is to ____?",
    explanation: "A bird lives in a nest; a bee lives in a hive.",
    options: opts(1, ["Flower", "Hive", "Honey", "Sky"]),
  },
  {
    categorySlug: "abstract-reasoning",
    difficulty: "MEDIUM",
    questionText: "Thermometer is to Temperature as Scale is to ____?",
    explanation: "A thermometer measures temperature; a scale measures weight.",
    options: opts(1, ["Height", "Weight", "Length", "Volume"]),
  },
  {
    categorySlug: "abstract-reasoning",
    difficulty: "HARD",
    questionText: "Which word does NOT belong with the others: Carrot, Potato, Onion, Apple?",
    explanation: "Carrot, Potato, and Onion are root vegetables; Apple is a fruit.",
    options: opts(3, ["Carrot", "Potato", "Onion", "Apple"]),
  },

  // Spatial reasoning
  {
    categorySlug: "spatial-reasoning",
    difficulty: "EASY",
    questionText: "If you fold a flat square piece of paper in half once, how many layers thick is it?",
    explanation: "Folding once doubles the layer count from 1 to 2.",
    options: opts(1, ["1", "2", "3", "4"]),
  },
  {
    categorySlug: "spatial-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "A cube has 6 faces. If you paint 2 opposite faces red and the rest blue, how many blue faces are there?",
    explanation: "6 total faces minus 2 red faces leaves 4 blue faces.",
    options: opts(2, ["2", "3", "4", "6"]),
  },
  {
    categorySlug: "spatial-reasoning",
    difficulty: "HARD",
    questionText:
      "A rectangular box is 3 cm longer than it is wide, and 2 cm shorter in height than its width. If the width is 5 cm, what is the sum of all three dimensions?",
    explanation: "Width = 5, length = 5 + 3 = 8, height = 5 - 2 = 3. Sum = 5 + 8 + 3 = 16.",
    options: opts(1, ["15", "16", "18", "14"]),
  },

  // Pattern recognition
  {
    categorySlug: "pattern-recognition",
    difficulty: "EASY",
    questionText: "2, 4, 6, 8, ___?",
    explanation: "Each number increases by 2.",
    options: opts(1, ["9", "10", "11", "12"]),
  },
  {
    categorySlug: "pattern-recognition",
    difficulty: "MEDIUM",
    questionText: "1, 4, 9, 16, ___?",
    explanation: "These are perfect squares: 1², 2², 3², 4², 5² = 25.",
    options: opts(2, ["20", "24", "25", "36"]),
  },
  {
    categorySlug: "pattern-recognition",
    difficulty: "HARD",
    questionText: "3, 6, 11, 18, 27, ___?",
    explanation: "The differences between terms are 3, 5, 7, 9, 11 — so the next term is 27 + 11 = 38.",
    options: opts(1, ["36", "38", "40", "35"]),
  },

  // Matrix reasoning
  {
    categorySlug: "matrix-reasoning",
    difficulty: "EASY",
    questionText:
      "A 2x2 grid has: top-left circle, top-right square, bottom-left circle, bottom-right ?. Each row must contain one circle and one square. What completes the bottom-right cell?",
    explanation: "The bottom row already has a circle, so it needs a square to satisfy the rule.",
    options: opts(1, ["Circle", "Square", "Triangle", "Star"]),
  },
  {
    categorySlug: "matrix-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "In a 3x3 grid, each row and column must contain exactly one Star, one Moon, and one Sun. Row 1: Star, Moon, Sun. Row 2: Moon, Sun, ?. What completes Row 2?",
    explanation: "Row 2 already has Moon and Sun, so the missing symbol must be Star.",
    options: opts(2, ["Moon", "Sun", "Star", "None of these"]),
  },
  {
    categorySlug: "matrix-reasoning",
    difficulty: "HARD",
    questionText:
      "In a 3x3 grid, each row and column contains exactly one Star, one Moon, and one Sun. Row 1: Sun, Star, Moon. Row 2: Moon, Sun, Star. Row 3: Star, ?, Sun. What completes the middle of Row 3?",
    explanation: "Column 2 already has Star (Row 1) and Sun (Row 2), so Row 3's middle cell must be Moon.",
    options: opts(2, ["Star", "Sun", "Moon", "Cannot be determined"]),
  },

  // Deductive reasoning
  {
    categorySlug: "deductive-reasoning",
    difficulty: "EASY",
    questionText: "All squares are rectangles. Shape X is a square. What can you conclude about Shape X?",
    explanation: "Since all squares are rectangles and X is a square, X must be a rectangle.",
    options: opts(0, ["X is a rectangle", "X is a circle", "X is not a rectangle", "Cannot be determined"]),
  },
  {
    categorySlug: "deductive-reasoning",
    difficulty: "MEDIUM",
    questionText: "If it rains, the game is cancelled. The game was not cancelled. What can you conclude?",
    explanation: "Contrapositive: if the game was not cancelled, it did not rain.",
    options: opts(1, ["It rained", "It did not rain", "The game was postponed", "Nothing can be concluded"]),
  },
  {
    categorySlug: "deductive-reasoning",
    difficulty: "HARD",
    questionText: "Only employees with a badge can enter the lab. Sam entered the lab. Which must be true?",
    explanation: "Entering the lab requires a badge, and Sam entered, so Sam must have a badge.",
    options: opts(0, ["Sam has a badge", "Sam is a manager", "Sam does not have a badge", "The lab was unlocked"]),
  },

  // Visual reasoning
  {
    categorySlug: "visual-reasoning",
    difficulty: "EASY",
    questionText:
      "Three shapes are solid black circles. One shape is a solid black square. Which shape is the odd one out?",
    explanation: "It's the only shape that is not a circle.",
    options: opts(3, ["First circle", "Second circle", "Third circle", "The square"]),
  },
  {
    categorySlug: "visual-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "Four labeled shapes: (A) large circle, (B) large square, (C) large triangle, (D) small triangle. Which one breaks the size pattern?",
    explanation: "The others are all large; D is the only small shape.",
    options: opts(3, ["Large circle", "Large square", "Large triangle", "Small triangle"]),
  },
  {
    categorySlug: "visual-reasoning",
    difficulty: "HARD",
    questionText:
      "A set of shapes follows this rule: each shape has one more side than the last, and one fewer dot than the last. Triangle (3 sides) has 3 dots. Square (4 sides) has 2 dots. Pentagon (5 sides) has 1 dot. Following the rule, how many dots does a Hexagon (6 sides) have?",
    explanation: "Dots decrease by 1 each step: 3, 2, 1, 0.",
    options: opts(0, ["0", "1", "2", "-1"]),
  },

  // Sequence completion
  {
    categorySlug: "sequence-completion",
    difficulty: "EASY",
    questionText: "A, C, E, G, ___?",
    explanation: "Each letter skips one letter of the alphabet: A, C, E, G, I.",
    options: opts(1, ["H", "I", "J", "F"]),
  },
  {
    categorySlug: "sequence-completion",
    difficulty: "MEDIUM",
    questionText: "1, 1, 2, 3, 5, 8, ___?",
    explanation: "Fibonacci sequence: each term is the sum of the two before it. 5 + 8 = 13.",
    options: opts(2, ["11", "12", "13", "10"]),
  },
  {
    categorySlug: "sequence-completion",
    difficulty: "HARD",
    questionText: "2, 6, 12, 20, 30, ___?",
    explanation: "Each term is n × (n+1): 1×2, 2×3, 3×4, 4×5, 5×6, 6×7 = 42.",
    options: opts(1, ["40", "42", "36", "44"]),
  },

  // Memory and attention
  {
    categorySlug: "memory-attention",
    difficulty: "EASY",
    questionText: "Study this list: Apple, Chair, Moon, Pencil. Which item was third in the list?",
    explanation: "The order was Apple (1st), Chair (2nd), Moon (3rd), Pencil (4th).",
    options: opts(2, ["Apple", "Chair", "Moon", "Pencil"]),
  },
  {
    categorySlug: "memory-attention",
    difficulty: "MEDIUM",
    questionText:
      "Read: 'The red car passed the blue house, then the green truck passed the yellow house.' Which color was the truck?",
    explanation: "The passage states the green truck passed the yellow house.",
    options: opts(2, ["Red", "Blue", "Green", "Yellow"]),
  },
  {
    categorySlug: "memory-attention",
    difficulty: "HARD",
    questionText:
      "Memorize this list: 7, 2, 9, 4, 1, 8. What is the sum of the 2nd and 5th numbers in that list?",
    explanation: "The 2nd number is 2 and the 5th number is 1. 2 + 1 = 3.",
    options: opts(0, ["3", "5", "9", "11"]),
  },
];

/**
 * Second batch — 2 more per difficulty for each category (60 total),
 * added specifically to fix the retake-randomness gap above: with only
 * coreDrafts (10 per difficulty), every attempt drew the full set.
 */
const expansionDrafts: Draft[] = [
  // Logical reasoning
  {
    categorySlug: "logical-reasoning",
    difficulty: "EASY",
    questionText: "If all Trons are Blips, and no Blips are Squeaks, which must be true?",
    explanation: "Since no Blips are Squeaks and all Trons are Blips, no Tron can be a Squeak.",
    options: opts(0, ["No Trons are Squeaks", "All Squeaks are Trons", "Some Trons are Squeaks", "All Blips are Trons"]),
  },
  {
    categorySlug: "logical-reasoning",
    difficulty: "EASY",
    questionText: "All dogs bark. Rex is a dog. What can you conclude?",
    explanation: "Since all dogs bark and Rex is a dog, Rex barks.",
    options: opts(0, ["Rex barks", "Rex meows", "Rex doesn't bark", "Cannot be determined"]),
  },
  {
    categorySlug: "logical-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "If the alarm is armed, entering triggers a siren. The siren did not go off even though someone entered. What can you conclude?",
    explanation: "The siren didn't fire despite an entry, so the alarm must not have been armed (contrapositive).",
    options: opts(1, ["The alarm was armed", "The alarm was not armed", "No one entered", "Cannot be determined"]),
  },
  {
    categorySlug: "logical-reasoning",
    difficulty: "MEDIUM",
    questionText: "Every manager has a parking pass. Fatima does not have a parking pass. What can you conclude about Fatima?",
    explanation: "Contrapositive: no parking pass means not a manager.",
    options: opts(1, ["Fatima is a manager", "Fatima is not a manager", "Fatima has two passes", "Cannot be determined"]),
  },
  {
    categorySlug: "logical-reasoning",
    difficulty: "HARD",
    questionText:
      "Anyone who passes the exam gets a certificate. No one who skips class gets a certificate. Jordan skipped class. What must be true?",
    explanation: "Skipping class means no certificate; getting a certificate requires passing; so skipping class means not passing.",
    options: opts(1, ["Jordan passed the exam", "Jordan did not pass the exam", "Jordan got a certificate", "Jordan did not skip class"]),
  },
  {
    categorySlug: "logical-reasoning",
    difficulty: "HARD",
    questionText: "All engineers can code. Some coders are not engineers. Priya can code. What can you conclude about Priya?",
    explanation: "Coding doesn't guarantee being an engineer, since some coders aren't — it can't be determined either way.",
    options: opts(2, ["Priya is an engineer", "Priya is not an engineer", "Priya might or might not be an engineer", "Priya is definitely a coder but not an engineer"]),
  },

  // Numerical reasoning
  {
    categorySlug: "numerical-reasoning",
    difficulty: "EASY",
    questionText: "What is 1/4 of 80?",
    explanation: "80 ÷ 4 = 20.",
    options: opts(1, ["15", "20", "25", "30"]),
  },
  {
    categorySlug: "numerical-reasoning",
    difficulty: "EASY",
    questionText: "If a dozen eggs cost $3, how much do 2 dozen cost?",
    explanation: "Double the eggs, double the price: $3 × 2 = $6.",
    options: opts(1, ["$5", "$6", "$7", "$9"]),
  },
  {
    categorySlug: "numerical-reasoning",
    difficulty: "MEDIUM",
    questionText: "A number increased by 25% equals 100. What was the original number?",
    explanation: "100 is 125% of the original, so the original is 100 / 1.25 = 80.",
    options: opts(1, ["75", "80", "85", "90"]),
  },
  {
    categorySlug: "numerical-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "The average of 4 numbers is 20. If one number is removed, the average of the remaining 3 is 18. What was the removed number?",
    explanation: "Original total = 80, remaining total = 54, so the removed number is 80 − 54 = 26.",
    options: opts(1, ["24", "26", "22", "28"]),
  },
  {
    categorySlug: "numerical-reasoning",
    difficulty: "HARD",
    questionText:
      "A car travels 60 miles in the first hour and increases speed by 10 mph each subsequent hour. How far does it travel in 3 hours total?",
    explanation: "Hour 1 = 60, hour 2 = 70, hour 3 = 80 miles. Total = 210.",
    options: opts(1, ["200", "210", "220", "190"]),
  },
  {
    categorySlug: "numerical-reasoning",
    difficulty: "HARD",
    questionText:
      "Workers A and B can finish a job in 12 and 18 days respectively. Working together, how many days will it take?",
    explanation: "Combined rate = 1/12 + 1/18 = 5/36 of the job per day, so it takes 36/5 = 7.2 days.",
    options: opts(0, ["7.2", "8", "6.5", "9"]),
  },

  // Abstract reasoning
  {
    categorySlug: "abstract-reasoning",
    difficulty: "EASY",
    questionText: "Pen is to Write as Knife is to ____?",
    explanation: "A pen is used to write; a knife is used to cut.",
    options: opts(0, ["Cut", "Sharp", "Kitchen", "Metal"]),
  },
  {
    categorySlug: "abstract-reasoning",
    difficulty: "EASY",
    questionText: "Fish is to Water as Bird is to ____?",
    explanation: "A fish lives in water; a bird lives in the sky.",
    options: opts(1, ["Nest", "Sky", "Feather", "Tree"]),
  },
  {
    categorySlug: "abstract-reasoning",
    difficulty: "MEDIUM",
    questionText: "Doctor is to Hospital as Teacher is to ____?",
    explanation: "A doctor works at a hospital; a teacher works at a school.",
    options: opts(1, ["Student", "School", "Book", "Classroom"]),
  },
  {
    categorySlug: "abstract-reasoning",
    difficulty: "MEDIUM",
    questionText: "Key is to Lock as Password is to ____?",
    explanation: "A key unlocks a lock; a password unlocks an account.",
    options: opts(1, ["Computer", "Account", "Security", "Internet"]),
  },
  {
    categorySlug: "abstract-reasoning",
    difficulty: "HARD",
    questionText: "Which word does NOT belong: Trout, Salmon, Dolphin, Cod?",
    explanation: "Trout, Salmon, and Cod are fish; a Dolphin is a mammal.",
    options: opts(2, ["Trout", "Salmon", "Dolphin", "Cod"]),
  },
  {
    categorySlug: "abstract-reasoning",
    difficulty: "HARD",
    questionText: "Which word does NOT belong: Violin, Cello, Guitar, Trumpet?",
    explanation: "Violin, Cello, and Guitar are string instruments; a Trumpet is brass.",
    options: opts(3, ["Violin", "Cello", "Guitar", "Trumpet"]),
  },

  // Spatial reasoning
  {
    categorySlug: "spatial-reasoning",
    difficulty: "EASY",
    questionText: "How many edges does a cube have?",
    explanation: "A cube has 12 edges.",
    options: opts(1, ["8", "12", "6", "10"]),
  },
  {
    categorySlug: "spatial-reasoning",
    difficulty: "EASY",
    questionText: "If you cut a square piece of paper diagonally once, how many triangles do you get?",
    explanation: "One diagonal cut splits a square into 2 triangles.",
    options: opts(1, ["1", "2", "3", "4"]),
  },
  {
    categorySlug: "spatial-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "A cube is painted on all faces, then cut into 27 equal smaller cubes (3×3×3). How many small cubes have paint on exactly one face?",
    explanation: "Exactly one face-center cube per face of the original cube is painted on only one side: 6 total.",
    options: opts(0, ["6", "8", "12", "1"]),
  },
  {
    categorySlug: "spatial-reasoning",
    difficulty: "MEDIUM",
    questionText: "A rectangular room is twice as long as it is wide. If the width is 4 meters, what is the room's perimeter?",
    explanation: "Width = 4, length = 8, perimeter = 2 × (4 + 8) = 24.",
    options: opts(1, ["20", "24", "28", "16"]),
  },
  {
    categorySlug: "spatial-reasoning",
    difficulty: "HARD",
    questionText: "A cube's volume is 64 cubic cm. What is the area of one face?",
    explanation: "Side length = 4 (since 4³ = 64), so one face's area = 4 × 4 = 16.",
    options: opts(1, ["8", "16", "4", "32"]),
  },
  {
    categorySlug: "spatial-reasoning",
    difficulty: "HARD",
    questionText:
      "You stack identical cubes to build a staircase: 1 cube on top, 2 cubes in the middle row, 3 cubes on the bottom row. How many cubes total?",
    explanation: "1 + 2 + 3 = 6.",
    options: opts(1, ["5", "6", "7", "9"]),
  },

  // Pattern recognition
  {
    categorySlug: "pattern-recognition",
    difficulty: "EASY",
    questionText: "5, 10, 15, 20, ___?",
    explanation: "Each number increases by 5.",
    options: opts(1, ["22", "25", "30", "24"]),
  },
  {
    categorySlug: "pattern-recognition",
    difficulty: "EASY",
    questionText: "A, B, A, B, A, ___?",
    explanation: "The pattern alternates A, B — after A comes B.",
    options: opts(1, ["A", "B", "C", "D"]),
  },
  {
    categorySlug: "pattern-recognition",
    difficulty: "MEDIUM",
    questionText: "1, 2, 4, 8, 16, ___?",
    explanation: "Each term doubles the previous one (powers of 2): 16 × 2 = 32.",
    options: opts(2, ["24", "30", "32", "20"]),
  },
  {
    categorySlug: "pattern-recognition",
    difficulty: "MEDIUM",
    questionText: "100, 90, 81, 73, ___?",
    explanation: "The differences are −10, −9, −8, so the next difference is −7: 73 − 7 = 66.",
    options: opts(2, ["64", "65", "66", "68"]),
  },
  {
    categorySlug: "pattern-recognition",
    difficulty: "HARD",
    questionText: "1, 2, 6, 24, 120, ___?",
    explanation: "These are factorials (1!, 2!, 3!, 4!, 5!, 6!): 6! = 720.",
    options: opts(1, ["600", "720", "640", "700"]),
  },
  {
    categorySlug: "pattern-recognition",
    difficulty: "HARD",
    questionText: "2, 5, 10, 17, 26, ___?",
    explanation: "Each term is n² + 1: 1²+1, 2²+1, 3²+1, 4²+1, 5²+1, 6²+1 = 37.",
    options: opts(2, ["35", "36", "37", "38"]),
  },

  // Matrix reasoning
  {
    categorySlug: "matrix-reasoning",
    difficulty: "EASY",
    questionText:
      "A 2x2 grid: top-left square, top-right triangle, bottom-left triangle, bottom-right ?. Each row and column must contain one square and one triangle. What completes bottom-right?",
    explanation: "Both its row and column already have a triangle, so the missing cell must be a square.",
    options: opts(0, ["Square", "Triangle", "Circle", "Star"]),
  },
  {
    categorySlug: "matrix-reasoning",
    difficulty: "EASY",
    questionText:
      "A 2x2 grid: top-left black dot, top-right white dot, bottom-left white dot, bottom-right ?. Each row must contain one black and one white dot. What completes bottom-right?",
    explanation: "The bottom row already has a white dot, so the missing cell must be black.",
    options: opts(1, ["White", "Black", "Gray", "None"]),
  },
  {
    categorySlug: "matrix-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "In a 3x3 grid using Circle, Square, and Triangle where each row and column contains exactly one of each: Row 1: Circle, Square, Triangle. Row 2: Square, Triangle, ?. What completes Row 2?",
    explanation: "Row 2 already has Square and Triangle, so the missing symbol is Circle.",
    options: opts(2, ["Square", "Triangle", "Circle", "None"]),
  },
  {
    categorySlug: "matrix-reasoning",
    difficulty: "MEDIUM",
    questionText:
      "Same grid rule. Row 1: Triangle, Circle, Square. Row 2: Circle, Square, Triangle. Row 3: Square, ?, Circle. What completes the middle of Row 3?",
    explanation: "Column 2 already has Circle (Row 1) and Square (Row 2), so the missing symbol is Triangle.",
    options: opts(2, ["Circle", "Square", "Triangle", "Cannot be determined"]),
  },
  {
    categorySlug: "matrix-reasoning",
    difficulty: "HARD",
    questionText:
      "In a 4x4 grid using symbols W, X, Y, Z where each row and column contains each symbol exactly once: Row 1: W,X,Y,Z. Row 2: X,Y,Z,W. Row 3: Y,Z,W,X. Row 4: Z,W,X,?. What completes Row 4?",
    explanation: "Row 4 already has Z, W, X, so the missing symbol is Y.",
    options: opts(2, ["W", "X", "Y", "Z"]),
  },
  {
    categorySlug: "matrix-reasoning",
    difficulty: "HARD",
    questionText:
      "Same 4x4 rule. Row 1: A,B,C,D. Row 2: B,A,D,C. Row 3: C,D,?,B. Row 4: D,C,B,A. What completes Row 3?",
    explanation: "Row 3 already has C, D, B, so the missing symbol is A — consistent with column 3 (C, D, _, B) also needing A.",
    options: opts(0, ["A", "B", "C", "D"]),
  },

  // Deductive reasoning
  {
    categorySlug: "deductive-reasoning",
    difficulty: "EASY",
    questionText: "All birds have feathers. A sparrow is a bird. What can you conclude?",
    explanation: "Since all birds have feathers and a sparrow is a bird, a sparrow has feathers.",
    options: opts(0, ["A sparrow has feathers", "A sparrow can fly", "A sparrow has no feathers", "Cannot be determined"]),
  },
  {
    categorySlug: "deductive-reasoning",
    difficulty: "EASY",
    questionText: "Every triangle has three sides. Shape Y is a triangle. What can you conclude?",
    explanation: "Since every triangle has three sides and Y is a triangle, Y has three sides.",
    options: opts(0, ["Y has three sides", "Y has four sides", "Y is round", "Cannot be determined"]),
  },
  {
    categorySlug: "deductive-reasoning",
    difficulty: "MEDIUM",
    questionText: "If the power is out, the lights don't turn on. The lights turned on. What can you conclude?",
    explanation: "Contrapositive: the lights turning on means the power is not out.",
    options: opts(1, ["The power is out", "The power is not out", "The lights are broken", "Cannot be determined"]),
  },
  {
    categorySlug: "deductive-reasoning",
    difficulty: "MEDIUM",
    questionText: "All members of the club pay dues. Sam does not pay dues. What can you conclude about Sam?",
    explanation: "Contrapositive: not paying dues means Sam is not a member.",
    options: opts(1, ["Sam is a member", "Sam is not a member", "Sam pays dues", "Cannot be determined"]),
  },
  {
    categorySlug: "deductive-reasoning",
    difficulty: "HARD",
    questionText: "Only citizens can vote. Only voters can run for office. Lee ran for office. What must be true about Lee?",
    explanation: "Running for office requires being a voter, which requires being a citizen — so Lee is a citizen.",
    options: opts(0, ["Lee is a citizen", "Lee is not a citizen", "Lee is a voter but not a citizen", "Cannot be determined"]),
  },
  {
    categorySlug: "deductive-reasoning",
    difficulty: "HARD",
    questionText: "All squares are rectangles. All rectangles are parallelograms. Shape Z is a square. What can you conclude?",
    explanation: "By the chain square → rectangle → parallelogram, Z must be a parallelogram.",
    options: opts(0, ["Z is a parallelogram", "Z is a triangle", "Z is not a parallelogram", "Cannot be determined"]),
  },

  // Visual reasoning
  {
    categorySlug: "visual-reasoning",
    difficulty: "EASY",
    questionText: "Four stars are the same size and color except one, which is a different color. How many stars match each other?",
    explanation: "3 stars share the same color; the 4th is different.",
    options: opts(2, ["1", "2", "3", "4"]),
  },
  {
    categorySlug: "visual-reasoning",
    difficulty: "EASY",
    questionText: "Three lines are solid; one line is dashed. Which is the odd one out?",
    explanation: "It's the only dashed line among solid ones.",
    options: opts(3, ["First solid line", "Second solid line", "Third solid line", "The dashed line"]),
  },
  {
    categorySlug: "visual-reasoning",
    difficulty: "MEDIUM",
    questionText: "Five shapes are all striped except one, which is solid-colored. How many shapes are striped?",
    explanation: "5 total shapes minus 1 solid-colored shape leaves 4 striped.",
    options: opts(1, ["3", "4", "5", "2"]),
  },
  {
    categorySlug: "visual-reasoning",
    difficulty: "MEDIUM",
    questionText: "Four arrows point right except one, which points left. How many point right?",
    explanation: "4 total arrows minus 1 left-pointing arrow leaves 3 pointing right.",
    options: opts(1, ["2", "3", "4", "1"]),
  },
  {
    categorySlug: "visual-reasoning",
    difficulty: "HARD",
    questionText:
      "A sequence of circles grows by 2 units in diameter each step and loses 1 stripe each step: Circle 1 has diameter 4 and 3 stripes. Circle 2 has diameter 6 and 2 stripes. Circle 3 has diameter 8 and 1 stripe. Following the pattern, what are Circle 4's diameter and stripe count?",
    explanation: "Diameter keeps increasing by 2 (→10) and stripes keep decreasing by 1 (→0).",
    options: opts(0, ["10 and 0", "10 and 1", "12 and 0", "8 and 0"]),
  },
  {
    categorySlug: "visual-reasoning",
    difficulty: "HARD",
    questionText:
      "Shapes rotate 90° clockwise each step: an arrow starts pointing up, then right, then down. What direction does it point at the next step?",
    explanation: "Continuing 90° clockwise from down leads to left.",
    options: opts(3, ["Up", "Right", "Down", "Left"]),
  },

  // Sequence completion
  {
    categorySlug: "sequence-completion",
    difficulty: "EASY",
    questionText: "10, 20, 30, 40, ___?",
    explanation: "Each number increases by 10.",
    options: opts(1, ["45", "50", "60", "55"]),
  },
  {
    categorySlug: "sequence-completion",
    difficulty: "EASY",
    questionText: "Z, Y, X, W, ___?",
    explanation: "The letters count backward through the alphabet: Z, Y, X, W, V.",
    options: opts(0, ["V", "U", "T", "S"]),
  },
  {
    categorySlug: "sequence-completion",
    difficulty: "MEDIUM",
    questionText: "3, 6, 9, 12, ___?",
    explanation: "Each number increases by 3.",
    options: opts(1, ["14", "15", "16", "18"]),
  },
  {
    categorySlug: "sequence-completion",
    difficulty: "MEDIUM",
    questionText: "2, 3, 5, 7, 11, ___?",
    explanation: "These are prime numbers in order; the next prime after 11 is 13.",
    options: opts(1, ["12", "13", "14", "15"]),
  },
  {
    categorySlug: "sequence-completion",
    difficulty: "HARD",
    questionText: "1, 3, 7, 15, 31, ___?",
    explanation: "Each term is the previous term doubled plus 1: 31 × 2 + 1 = 63.",
    options: opts(0, ["63", "60", "61", "62"]),
  },
  {
    categorySlug: "sequence-completion",
    difficulty: "HARD",
    questionText: "4, 9, 19, 39, 79, ___?",
    explanation: "Each term is the previous term doubled plus 1: 79 × 2 + 1 = 159.",
    options: opts(1, ["158", "159", "160", "157"]),
  },

  // Memory and attention
  {
    categorySlug: "memory-attention",
    difficulty: "EASY",
    questionText: "Study this list: Lion, Tiger, Bear, Wolf. Which animal was first in the list?",
    explanation: "Lion was listed first.",
    options: opts(0, ["Lion", "Tiger", "Bear", "Wolf"]),
  },
  {
    categorySlug: "memory-attention",
    difficulty: "EASY",
    questionText: "Study this list: Red, Blue, Green, Yellow. Which color was last?",
    explanation: "Yellow was listed last.",
    options: opts(3, ["Red", "Blue", "Green", "Yellow"]),
  },
  {
    categorySlug: "memory-attention",
    difficulty: "MEDIUM",
    questionText: "Read: 'Anna arrived before Ben, and Ben arrived before Carla.' Who arrived first?",
    explanation: "Anna arrived before both Ben and Carla, so Anna was first.",
    options: opts(0, ["Anna", "Ben", "Carla", "Cannot be determined"]),
  },
  {
    categorySlug: "memory-attention",
    difficulty: "MEDIUM",
    questionText: "Read: 'The small box is inside the medium box, which is inside the large box.' Which box is in the middle?",
    explanation: "The nesting order is small, medium, large — medium is in the middle.",
    options: opts(1, ["Small", "Medium", "Large", "Cannot be determined"]),
  },
  {
    categorySlug: "memory-attention",
    difficulty: "HARD",
    questionText: "Memorize this list: 3, 8, 5, 2, 9, 6. What is the sum of the 1st and 6th numbers?",
    explanation: "The 1st number is 3 and the 6th number is 6. 3 + 6 = 9.",
    options: opts(1, ["8", "9", "11", "12"]),
  },
  {
    categorySlug: "memory-attention",
    difficulty: "HARD",
    questionText: "Memorize this list: 6, 1, 4, 9, 3, 7. What is the difference between the 4th number and the 2nd number?",
    explanation: "The 4th number is 9 and the 2nd number is 1. 9 − 1 = 8.",
    options: opts(1, ["7", "8", "9", "6"]),
  },
];

const drafts: Draft[] = [...coreDrafts, ...expansionDrafts];

export const SEED_QUESTIONS: QuestionInput[] = drafts.map((draft) => ({
  questionText: draft.questionText,
  difficulty: draft.difficulty,
  categorySlug: draft.categorySlug,
  explanation: draft.explanation,
  expectedSolvingTimeSeconds: TIME_BY_DIFFICULTY[draft.difficulty],
  scoringWeight: WEIGHT_BY_DIFFICULTY[draft.difficulty],
  kind: "STANDARD",
  options: draft.options,
}));
