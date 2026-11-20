import { createHmac, randomBytes, randomInt } from "node:crypto";

function getSecret(): string {
  const secret = process.env.AUTH_HASH_SECRET;
  if (!secret) {
    throw new Error("AUTH_HASH_SECRET is not set");
  }
  return secret;
}

/** HMAC, not a plain hash — storing a keyed digest means a leaked DB alone
 * doesn't let an attacker rebuild a lookup table against this value space. */
export function hashWithSecret(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("hex");
}
