import { describe, expect, it } from "vitest";
import type { User } from "@prisma/client";
import { assertAdmin, ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";

function makeUser(role: "USER" | "ADMIN"): User {
  return {
    id: "u1",
    email: "x@example.com",
    displayName: null,
    role,
    emailVerifiedAt: new Date(),
    isFreeTierEligible: false,
    freeTierRank: null,
    publicLeaderboardOptIn: true,
    registrationIp: null,
    deletedAt: null,
    reminderUnsubscribedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("assertAdmin", () => {
  it("throws UnauthorizedError when there is no user", () => {
    expect(() => assertAdmin(null)).toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError for a logged-in non-admin user", () => {
    expect(() => assertAdmin(makeUser("USER"))).toThrow(ForbiddenError);
  });

  it("returns the user when they are an admin", () => {
    const admin = makeUser("ADMIN");
    expect(assertAdmin(admin)).toBe(admin);
  });
});
