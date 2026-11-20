import { Google, LinkedIn, decodeIdToken, generateCodeVerifier, generateState } from "arctic";
import type { OAuthProvider } from "@prisma/client";
import { getOAuthConfig } from "./config";

export type OAuthUserInfo = {
  providerAccountId: string;
  email: string;
  displayName: string | null;
};

// decodeIdToken does not verify the signature — safe here because the
// token comes directly from the provider's token endpoint over a
// server-to-server HTTPS call we initiated, never from the browser
// (the standard trust model for the authorization code flow).
type OidcIdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
};

function buildClient(provider: OAuthProvider, config: { clientId: string; clientSecret: string; redirectUri: string }) {
  return provider === "GOOGLE"
    ? new Google(config.clientId, config.clientSecret, config.redirectUri)
    : new LinkedIn(config.clientId, config.clientSecret, config.redirectUri);
}

/** Returns null when the provider isn't configured — callers translate
 * that into a clean `503 provider_not_configured`. */
export function buildAuthorizationUrl(
  provider: OAuthProvider,
): { url: URL; state: string; codeVerifier: string | null } | null {
  const config = getOAuthConfig(provider);
  if (!config) return null;

  const state = generateState();

  if (provider === "GOOGLE") {
    // Google requires PKCE; LinkedIn's OIDC product doesn't support it.
    const codeVerifier = generateCodeVerifier();
    const url = new Google(config.clientId, config.clientSecret, config.redirectUri).createAuthorizationURL(
      state,
      codeVerifier,
      ["openid", "email", "profile"],
    );
    return { url, state, codeVerifier };
  }

  const url = new LinkedIn(config.clientId, config.clientSecret, config.redirectUri).createAuthorizationURL(
    state,
    ["openid", "email", "profile"],
  );
  return { url, state, codeVerifier: null };
}

export async function exchangeCodeForUserInfo(
  provider: OAuthProvider,
  code: string,
  codeVerifier: string | null,
): Promise<OAuthUserInfo> {
  const config = getOAuthConfig(provider);
  if (!config) {
    throw new Error(`OAuth provider ${provider} is not configured`);
  }

  const client = buildClient(provider, config);
  const tokens =
    client instanceof Google
      ? await client.validateAuthorizationCode(code, codeVerifier ?? "")
      : await client.validateAuthorizationCode(code);

  const claims = decodeIdToken(tokens.idToken()) as OidcIdTokenClaims;
  if (!claims.sub || !claims.email) {
    throw new Error(`OAuth provider ${provider} did not return a subject id and email`);
  }

  return {
    providerAccountId: claims.sub,
    email: claims.email.toLowerCase(),
    displayName: claims.name ?? null,
  };
}
