import { prisma } from "@/lib/db/client";
import { issueVerificationPair } from "./verification";

/**
 * Returns null for both "no such account" and "account deleted" — callers
 * must respond identically either way to avoid leaking which emails are
 * registered (docs/API.md §9 rate-limiting rationale extends to this).
 */
export async function requestLoginCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || user.deletedAt) {
    return null;
  }

  const { rawCode, rawToken, expiresAt } = await issueVerificationPair(prisma, user.id);
  return { user, rawCode, rawToken, expiresAt };
}
