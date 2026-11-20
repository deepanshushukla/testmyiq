import { hashWithSecret } from "@/lib/auth/crypto";

/**
 * Deterministic (not stored), so an unsubscribe link in an old email stays
 * valid indefinitely without a DB round-trip to verify — same HMAC
 * primitive as session/OTP hashing (`lib/auth/crypto.ts`), just a
 * different namespace prefix so it can never collide with those tokens.
 */
export function buildUnsubscribeToken(userId: string): string {
  return hashWithSecret(`reminder-unsubscribe:${userId}`);
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  return buildUnsubscribeToken(userId) === token;
}

export function buildUnsubscribeUrl(userId: string, baseUrl: string): string {
  const token = buildUnsubscribeToken(userId);
  return `${baseUrl}/unsubscribe?userId=${encodeURIComponent(userId)}&token=${token}`;
}
