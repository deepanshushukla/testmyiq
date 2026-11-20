import { generateOpaqueToken } from "@/lib/auth/crypto";

/** 16-char hex, unguessable — same primitive used for magic-link tokens,
 * just a shorter byte length since this goes in a shareable URL. */
export function generateCandidateSlug(): string {
  return generateOpaqueToken(8);
}
