import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";

describe("enforceRateLimit", () => {
  it("allows calls up to the limit and rejects the one after", async () => {
    const key = `test:${randomUUID()}`;

    await enforceRateLimit(key, 3, 60);
    await enforceRateLimit(key, 3, 60);
    await enforceRateLimit(key, 3, 60);

    await expect(enforceRateLimit(key, 3, 60)).rejects.toBeInstanceOf(RateLimitError);
  });

  it("tracks independent keys independently", async () => {
    const keyA = `test:${randomUUID()}`;
    const keyB = `test:${randomUUID()}`;

    await enforceRateLimit(keyA, 1, 60);
    await expect(enforceRateLimit(keyA, 1, 60)).rejects.toBeInstanceOf(RateLimitError);

    // A different key should be unaffected by keyA's limit.
    await expect(enforceRateLimit(keyB, 1, 60)).resolves.not.toThrow();
  });
});
