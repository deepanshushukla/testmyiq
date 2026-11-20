import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { allocateFreeTierSlot } from "@/lib/auth/free-tier";

describe("allocateFreeTierSlot concurrency (docs/DATABASE.md §3)", () => {
  beforeEach(async () => {
    await prisma.systemSetting.upsert({
      where: { key: "free_tier_allocation" },
      update: { value: { count: 0, cap: 10 } },
      create: { key: "free_tier_allocation", value: { count: 0, cap: 10 } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("never allocates more than the cap, even with far more concurrent callers than slots", async () => {
    const concurrentAttempts = 30;

    const results = await Promise.all(
      Array.from({ length: concurrentAttempts }, () =>
        prisma.$transaction((tx) => allocateFreeTierSlot(tx)),
      ),
    );

    const allocatedRanks = results.filter((rank): rank is number => rank !== null);

    expect(allocatedRanks).toHaveLength(10);
    expect(new Set(allocatedRanks).size).toBe(10);
    expect(Math.min(...allocatedRanks)).toBe(1);
    expect(Math.max(...allocatedRanks)).toBe(10);

    const setting = await prisma.systemSetting.findUniqueOrThrow({
      where: { key: "free_tier_allocation" },
    });
    expect((setting.value as { count: number }).count).toBe(10);
  });

  it("returns null once the cap is already reached", async () => {
    for (let i = 0; i < 10; i += 1) {
      await prisma.$transaction((tx) => allocateFreeTierSlot(tx));
    }

    const eleventh = await prisma.$transaction((tx) => allocateFreeTierSlot(tx));
    expect(eleventh).toBeNull();
  });

  it("respects a configured cap other than 10", async () => {
    await prisma.systemSetting.update({
      where: { key: "free_tier_allocation" },
      data: { value: { count: 0, cap: 3 } },
    });

    const results = await Promise.all(
      Array.from({ length: 8 }, () => prisma.$transaction((tx) => allocateFreeTierSlot(tx))),
    );

    expect(results.filter((rank) => rank !== null)).toHaveLength(3);
  });
});
