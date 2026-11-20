import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { findOrCreateOAuthUser } from "@/lib/auth/oauth/account";
import { registerUser } from "@/lib/auth/registration";
import { consumeOtp } from "@/lib/auth/verification";

async function resetDb() {
  await prisma.user.deleteMany();
  await prisma.systemSetting.upsert({
    where: { key: "free_tier_allocation" },
    update: { value: { count: 0, cap: 10 } },
    create: { key: "free_tier_allocation", value: { count: 0, cap: 10 } },
  });
}

describe("findOrCreateOAuthUser", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a brand-new, already-verified user and allocates a free-tier slot", async () => {
    const user = await findOrCreateOAuthUser({
      provider: "GOOGLE",
      providerAccountId: "google-sub-1",
      email: "new-oauth-user@example.com",
      displayName: "New User",
      referralCode: null,
      registrationIp: "203.0.113.1",
    });

    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.isFreeTierEligible).toBe(true);
    expect(user.freeTierRank).toBe(1);
    expect(user.displayName).toBe("New User");

    const account = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: "GOOGLE", providerAccountId: "google-sub-1" } },
    });
    expect(account?.userId).toBe(user.id);
  });

  it("is idempotent on repeat login — same user, no duplicate account, no double allocation", async () => {
    const first = await findOrCreateOAuthUser({
      provider: "GOOGLE",
      providerAccountId: "google-sub-2",
      email: "repeat-login@example.com",
      displayName: null,
      referralCode: null,
      registrationIp: null,
    });
    const second = await findOrCreateOAuthUser({
      provider: "GOOGLE",
      providerAccountId: "google-sub-2",
      email: "repeat-login@example.com",
      displayName: null,
      referralCode: null,
      registrationIp: null,
    });

    expect(second.id).toBe(first.id);
    expect(second.freeTierRank).toBe(first.freeTierRank);

    const accounts = await prisma.oAuthAccount.findMany({ where: { userId: first.id } });
    expect(accounts).toHaveLength(1);

    const setting = await prisma.systemSetting.findUniqueOrThrow({
      where: { key: "free_tier_allocation" },
    });
    expect((setting.value as { count: number }).count).toBe(1);
  });

  it("links to an existing, still-unverified email user and allocates free tier at link time", async () => {
    const { user: unverified } = await registerUser({ email: "half-registered@example.com" });
    expect(unverified.emailVerifiedAt).toBeNull();

    const linked = await findOrCreateOAuthUser({
      provider: "LINKEDIN",
      providerAccountId: "linkedin-sub-1",
      email: "half-registered@example.com",
      displayName: null,
      referralCode: null,
      registrationIp: null,
    });

    expect(linked.id).toBe(unverified.id);
    expect(linked.emailVerifiedAt).not.toBeNull();
    expect(linked.isFreeTierEligible).toBe(true);
    expect(linked.freeTierRank).toBe(1);
  });

  it("linking to an already-verified email user never re-allocates free tier", async () => {
    const { rawCode } = await registerUser({ email: "already-verified@example.com" });
    const verified = await consumeOtp("already-verified@example.com", rawCode);
    expect(verified.freeTierRank).toBe(1);

    const linked = await findOrCreateOAuthUser({
      provider: "GOOGLE",
      providerAccountId: "google-sub-3",
      email: "already-verified@example.com",
      displayName: null,
      referralCode: null,
      registrationIp: null,
    });

    expect(linked.id).toBe(verified.id);
    expect(linked.freeTierRank).toBe(1);

    const setting = await prisma.systemSetting.findUniqueOrThrow({
      where: { key: "free_tier_allocation" },
    });
    expect((setting.value as { count: number }).count).toBe(1);
  });

  it("attributes a referral on brand-new OAuth signup, matching the email registration path", async () => {
    const { user: referrer } = await registerUser({ email: "oauth-referrer@example.com" });
    const referralCode = await prisma.referralCode.create({
      data: { userId: referrer.id, code: "OAUTHREF" },
    });

    const referred = await findOrCreateOAuthUser({
      provider: "GOOGLE",
      providerAccountId: "google-sub-4",
      email: "oauth-referred@example.com",
      displayName: null,
      referralCode: referralCode.code,
      registrationIp: null,
    });

    const referral = await prisma.referral.findUnique({
      where: { referredUserId: referred.id },
      include: { qualification: true },
    });
    expect(referral?.referrerUserId).toBe(referrer.id);
    expect(referral?.qualification?.status).toBe("PENDING");
  });

  it("never creates two users under concurrently racing duplicate callbacks", async () => {
    const params = {
      provider: "GOOGLE" as const,
      providerAccountId: "google-sub-race",
      email: "race@example.com",
      displayName: null,
      referralCode: null,
      registrationIp: null,
    };

    const [a, b] = await Promise.all([findOrCreateOAuthUser(params), findOrCreateOAuthUser(params)]);
    expect(a.id).toBe(b.id);

    const users = await prisma.user.findMany({ where: { email: "race@example.com" } });
    expect(users).toHaveLength(1);

    const accounts = await prisma.oAuthAccount.findMany({
      where: { provider: "GOOGLE", providerAccountId: "google-sub-race" },
    });
    expect(accounts).toHaveLength(1);
  });
});
