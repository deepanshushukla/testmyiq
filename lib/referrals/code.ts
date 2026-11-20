import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { ReferralError } from "./errors";

// Uppercase alphanumeric, excluding visually ambiguous characters (0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_GENERATION_ATTEMPTS = 5;

function generateCandidateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/**
 * Idempotent — a user has exactly one referral code for life
 * (ReferralCode.userId is unique), created lazily on first request rather
 * than at registration, since most users never need one.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId } });
  if (existing) {
    return existing.code;
  }

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const created = await prisma.referralCode.create({
        data: { userId, code: generateCandidateCode() },
      });
      return created.code;
    } catch (error) {
      const isCodeCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[] | undefined)?.includes("code");

      if (isCodeCollision) {
        continue; // vanishingly rare with an 8-char alphabet, but retry anyway
      }

      // Not a code collision — most likely userId's unique constraint,
      // meaning a concurrent request already created one. Return it.
      const existingAfterRace = await prisma.referralCode.findUnique({ where: { userId } });
      if (existingAfterRace) {
        return existingAfterRace.code;
      }
      throw error;
    }
  }

  throw new ReferralError(
    "code_generation_failed",
    "Could not generate a unique referral code after several attempts",
  );
}
