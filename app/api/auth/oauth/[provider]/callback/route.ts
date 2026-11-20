import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForUserInfo } from "@/lib/auth/oauth/providers";
import { parseProviderParam } from "@/lib/auth/oauth/provider-param";
import { findOrCreateOAuthUser } from "@/lib/auth/oauth/account";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { getClientIp } from "@/lib/http/get-client-ip";

/**
 * On any failure this redirects to `/login?error=oauth_failed` rather
 * than throwing a raw error page — same spirit as `verify-magic-link`'s
 * redirect-based error handling, since this is a link a user is bounced
 * back to from the provider, not a fetch call a frontend can parse JSON
 * from.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const { provider: rawProvider } = await params;
  const provider = parseProviderParam(rawProvider);

  const state = request.cookies.get("oauth_state")?.value;
  const codeVerifier = request.cookies.get("oauth_code_verifier")?.value ?? null;
  const referralCode = request.cookies.get("oauth_ref")?.value ?? null;

  const clearOAuthCookies = (response: NextResponse) => {
    response.cookies.delete("oauth_state");
    response.cookies.delete("oauth_code_verifier");
    response.cookies.delete("oauth_ref");
    return response;
  };

  if (!provider) {
    return clearOAuthCookies(NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`));
  }

  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");

  // CSRF check: the state echoed back by the provider must match the one
  // we minted at /start and stored in an httpOnly cookie only we can read.
  if (!code || !returnedState || !state || returnedState !== state) {
    return clearOAuthCookies(NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`));
  }

  try {
    const userInfo = await exchangeCodeForUserInfo(provider, code, codeVerifier);

    const user = await findOrCreateOAuthUser({
      provider,
      providerAccountId: userInfo.providerAccountId,
      email: userInfo.email,
      displayName: userInfo.displayName,
      referralCode,
      registrationIp: getClientIp(request),
    });

    const { rawToken, expiresAt } = await createSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ipAddress: getClientIp(request),
    });
    await setSessionCookie(rawToken, expiresAt);

    return clearOAuthCookies(NextResponse.redirect(`${baseUrl}/dashboard`));
  } catch (error) {
    console.error(error);
    return clearOAuthCookies(NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`));
  }
}
