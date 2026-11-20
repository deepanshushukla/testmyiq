import type { OAuthProvider } from "@prisma/client";
import { BASE_URL } from "@/lib/seo/constants";

export type OAuthProviderConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * Returns null when a provider's env vars aren't set — callers must fail
 * clean (`503 provider_not_configured`) rather than crash or fake a
 * login, same precedent as `lib/payments/stripe-client.ts` in Phase 8.
 * No real Google/LinkedIn OAuth app credentials exist yet, so this is the
 * expected path until the user supplies them.
 */
export function getOAuthConfig(provider: OAuthProvider): OAuthProviderConfig | null {
  const redirectUri = new URL(`/api/auth/oauth/${provider.toLowerCase()}/callback`, BASE_URL).toString();

  if (provider === "GOOGLE") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret, redirectUri };
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}
