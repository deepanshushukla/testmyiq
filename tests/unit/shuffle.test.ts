import { describe, expect, it } from "vitest";
import { shuffle } from "@/lib/assessment/shuffle";

describe("shuffle", () => {
  it("preserves every element with no duplicates or omissions", () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const result = shuffle(input);

    expect(result).toHaveLength(input.length);
    expect(new Set(result)).toEqual(new Set(input));
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);

    expect(input).toEqual(copy);
  });
});
