/**
 * requirement.txt Part 7 example levels, with XP thresholds as a
 * documented assumption (the spec gives names, not numbers). Ordered
 * ascending — the user's level is the highest threshold their XP total
 * has reached or passed.
 */
export const LEVELS = [
  { name: "Beginner", minXp: 0 },
  { name: "Explorer", minXp: 150 },
  { name: "Thinker", minXp: 400 },
  { name: "Strategist", minXp: 800 },
  { name: "Mastermind", minXp: 1500 },
] as const;

export type LevelName = (typeof LEVELS)[number]["name"];

export function getLevelForXp(xpTotal: number): LevelName {
  let current: LevelName = LEVELS[0].name;
  for (const level of LEVELS) {
    if (xpTotal >= level.minXp) {
      current = level.name;
    }
  }
  return current;
}

/** Null once the user has reached the top level (Mastermind) — there's
 * nothing further to progress toward. */
export function getNextLevelThreshold(xpTotal: number): number | null {
  const next = LEVELS.find((level) => xpTotal < level.minXp);
  return next ? next.minXp : null;
}
