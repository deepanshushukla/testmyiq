import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { registerUser } from "@/lib/auth/registration";
import { consumeMagicLink, consumeOtp } from "@/lib/auth/verification";
import { attributeReferral } from "@/lib/auth/referral";
import { AuthError } from "@/lib/auth/errors";

async function resetDb() {
  await prisma.user.deleteMany();
  await prisma.systemSetting.upsert({
    where: { key: "free_tier_allocation" },
    update: { value: { count: 0, cap: 10 } },
    create: { key: "free_tier_allocation", value: { count: 0, cap: 10 } },
  });
}

describe("registration + verification", () => {
  beforeEach(resetDb);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates an unverified user and issues a usable OTP", async () => {
    const { user, rawCode } = await registerUser({ email: "alice@example.com" });

    expect(user.emailVerifiedAt).toBeNull();

    const verified = await consumeOtp("alice@example.com", rawCode);
    expect(verified.emailVerifiedAt).not.toBeNull();
    expect(verified.isFreeTierEligible).toBe(true);
    expect(verified.freeTierRank).toBe(1);
  });

  it("rejects a wrong OTP code", async () => {
    await registerUser({ email: "bob@example.com" });

    await expect(consumeOtp("bob@example.com", "000000")).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects reusing an already-consumed OTP code", async () => {
    const { rawCode } = await registerUser({ email: "carol@example.com" });

    await consumeOtp("carol@example.com", rawCode);
    await expect(consumeOtp("carol@example.com", rawCode)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects an expired OTP code", async () => {
    const { rawCode } = await registerUser({ email: "dave@example.com" });

    await prisma.emailVerification.updateMany({
      where: { type: "OTP" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(consumeOtp("dave@example.com", rawCode)).rejects.toBeInstanceOf(AuthError);
  });

  it("consuming the OTP invalidates the sibling magic link from the same request", async () => {
    const { rawCode, rawToken } = await registerUser({ email: "erin@example.com" });

    await consumeOtp("erin@example.com", rawCode);

    await expect(consumeMagicLink(rawToken)).rejects.toBeInstanceOf(AuthError);
  });

  it("consuming the magic link verifies the user and invalidates the sibling OTP", async () => {
    const { rawCode, rawToken } = await registerUser({ email: "frank@example.com" });

    const verified = await consumeMagicLink(rawToken);
    expect(verified.emailVerifiedAt).not.toBeNull();

    await expect(consumeOtp("frank@example.com", rawCode)).rejects.toBeInstanceOf(AuthError);
  });

  it("does not re-run free-tier allocation on a second verification request (login) for an already-verified user", async () => {
    const { rawCode } = await registerUser({ email: "grace@example.com" });
    const first = await consumeOtp("grace@example.com", rawCode);
    expect(first.freeTierRank).toBe(1);

    // Simulate a later login code for the same (already verified) user.
    const { issueVerificationPair } = await import("@/lib/auth/verification");
    const { rawCode: secondCode } = await issueVerificationPair(prisma, first.id);
    const second = await consumeOtp("grace@example.com", secondCode);

    expect(second.freeTierRank).toBe(1); // unchanged, not reallocated
  });

  it("rejects registering an email that already exists", async () => {
    await registerUser({ email: "henry@example.com" });

    await expect(registerUser({ email: "henry@example.com" })).rejects.toMatchObject({
      code: "already_registered",
    });
  });

  it("attributes a referral at registration time when a valid code is supplied", async () => {
    const { user: referrer } = await registerUser({ email: "referrer@example.com" });
    const referralCode = await prisma.referralCode.create({
      data: { userId: referrer.id, code: "REF123" },
    });

    const { user: referred } = await registerUser({
      email: "referred@example.com",
      referralCode: referralCode.code,
    });

    const referral = await prisma.referral.findUnique({
      where: { referredUserId: referred.id },
      include: { qualification: true },
    });

    expect(referral?.referrerUserId).toBe(referrer.id);
    expect(referral?.qualification?.status).toBe("PENDING");
  });

  it("silently ignores an invalid referral code instead of blocking registration", async () => {
    const { user } = await registerUser({
      email: "nobody-referred@example.com",
      referralCode: "DOES-NOT-EXIST",
    });

    const referral = await prisma.referral.findUnique({ where: { referredUserId: user.id } });
    expect(referral).toBeNull();
  });

  it("guards against self-referral in application code", async () => {
    const { user } = await registerUser({ email: "self@example.com" });
    const referralCode = await prisma.referralCode.create({
      data: { userId: user.id, code: "SELFCODE" },
    });

    await prisma.$transaction(async (tx) => {
      await attributeReferral(tx, user.id, referralCode.code);
    });

    const referral = await prisma.referral.findUnique({ where: { referredUserId: user.id } });
    expect(referral).toBeNull();
  });

  it("enforces the no-self-referral rule at the database level too", async () => {
    const { user } = await registerUser({ email: "dbcheck@example.com" });
    const referralCode = await prisma.referralCode.create({
      data: { userId: user.id, code: "DBCHECKCODE" },
    });

    await expect(
      prisma.referral.create({
        data: { referrerUserId: user.id, referredUserId: user.id, referralCodeId: referralCode.id },
      }),
    ).rejects.toThrow();
  });
});
