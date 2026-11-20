import type { Prisma, PrismaClient, User } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { allocateFreeTierSlot } from "./free-tier";
import { generateOpaqueToken, generateOtpCode, hashWithSecret } from "./crypto";
import { AuthError } from "./errors";

type Client = PrismaClient | Prisma.TransactionClient;

const VERIFICATION_TTL_MS = 15 * 60 * 1000;

/**
 * Creates an OTP + magic-link pair for the same verification attempt.
 * Both share an expiry; consuming either one invalidates the other
 * (see consumeVerificationRecord).
 */
export async function issueVerificationPair(client: Client, userId: string) {
  const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS);
  const rawCode = generateOtpCode();
  const rawToken = generateOpaqueToken();

  await client.emailVerification.create({
    data: { userId, type: "OTP", codeHash: hashWithSecret(rawCode), expiresAt },
  });
  await client.emailVerification.create({
    data: { userId, type: "MAGIC_LINK", tokenHash: hashWithSecret(rawToken), expiresAt },
  });

  return { rawCode, rawToken, expiresAt };
}

type VerificationWithUser = Prisma.EmailVerificationGetPayload<{ include: { user: true } }>;

async function consumeVerificationRecord(
  findRecord: (
    tx: Prisma.TransactionClient,
    now: Date,
  ) => Promise<VerificationWithUser | null>,
): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const record = await findRecord(tx, now);

    if (!record) {
      throw new AuthError("invalid_or_expired", "This code or link is invalid or has expired.");
    }

    await tx.emailVerification.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });

    // Invalidate the sibling OTP/magic-link issued in the same request, so
    // a consumed code can't be followed by the still-valid magic link.
    await tx.emailVerification.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: now },
    });

    let user = record.user;

    if (!user.emailVerifiedAt) {
      const rank = await allocateFreeTierSlot(tx);
      const isFreeTier = rank !== null;

      user = await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: now,
          isFreeTierEligible: isFreeTier,
          freeTierRank: rank,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: isFreeTier ? "FREE_TIER_ALLOCATED" : "EMAIL_VERIFIED",
          entityType: "User",
          entityId: user.id,
          metadata: isFreeTier ? { rank } : undefined,
        },
      });
    }

    return user;
  });
}

/**
 * Scoped by email + codeHash together, never codeHash alone — the OTP
 * space is only 1,000,000 values, so two different pending users could in
 * principle share a code; scoping by email rules that out entirely.
 */
export function consumeOtp(email: string, code: string): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();
  const codeHash = hashWithSecret(code);

  return consumeVerificationRecord((tx, now) =>
    tx.emailVerification.findFirst({
      where: {
        type: "OTP",
        codeHash,
        consumedAt: null,
        expiresAt: { gt: now },
        user: { email: normalizedEmail },
      },
      include: { user: true },
    }),
  );
}

/** tokenHash is a 256-bit value — globally unique lookup is safe without
 * additionally scoping by email. */
export function consumeMagicLink(token: string): Promise<User> {
  const tokenHash = hashWithSecret(token);

  return consumeVerificationRecord((tx, now) =>
    tx.emailVerification.findFirst({
      where: { type: "MAGIC_LINK", tokenHash, consumedAt: null, expiresAt: { gt: now } },
      include: { user: true },
    }),
  );
}
