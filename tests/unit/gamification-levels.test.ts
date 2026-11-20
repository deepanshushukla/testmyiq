import { describe, expect, it } from "vitest";
import { getLevelForXp, getNextLevelThreshold } from "@/lib/gamification/levels";

describe("getLevelForXp", () => {
  it("starts at Beginner for 0 XP", () => {
    expect(getLevelForXp(0)).toBe("Beginner");
  });

  it("stays at the current level just below the next threshold", () => {
    expect(getLevelForXp(149)).toBe("Beginner");
  });

  it("advances exactly at a threshold", () => {
    expect(getLevelForXp(150)).toBe("Explorer");
  });

  it("reaches the top level and stays there past its threshold", () => {
    expect(getLevelForXp(1500)).toBe("Mastermind");
    expect(getLevelForXp(50_000)).toBe("Mastermind");
  });
});

describe("getNextLevelThreshold", () => {
  it("returns the next level's threshold", () => {
    expect(getNextLevelThreshold(0)).toBe(150);
    expect(getNextLevelThreshold(150)).toBe(400);
  });

  it("returns null once at the max level — nothing further to progress toward", () => {
    expect(getNextLevelThreshold(1500)).toBeNull();
    expect(getNextLevelThreshold(50_000)).toBeNull();
  });
});
