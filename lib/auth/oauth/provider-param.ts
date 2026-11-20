import type { OAuthProvider } from "@prisma/client";

/** Maps the lowercase URL segment (`google`/`linkedin`) to the Prisma
 * enum value — kept separate from `config.ts` since both routes need it
 * before they know anything about configuration. */
export function parseProviderParam(raw: string): OAuthProvider | null {
  if (raw === "google") return "GOOGLE";
  if (raw === "linkedin") return "LINKEDIN";
  return null;
}
