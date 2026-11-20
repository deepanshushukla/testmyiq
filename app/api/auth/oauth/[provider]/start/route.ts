import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizationUrl } from "@/lib/auth/oauth/providers";
import { parseProviderParam } from "@/lib/auth/oauth/provider-param";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

const COOKIE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const { provider: rawProvider } = await params;
  const provider = parseProviderParam(rawProvider);

  // Redirect-based errors, not JSON — this route is only ever reached via
  // a plain <a href> navigation (see app/(auth)/OAuthButtons.tsx), the
  // same convention verify-magic-link uses for the same reason: there's
  // no frontend fetch() call here to parse a JSON body from.
  if (!provider) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
  }

  const ip = getClientIp(request);
  try {
    await enforceRateLimit(`oauth-start:ip:${ip}`, 20, 60 * 60);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.redirect(`${baseUrl}/login?error=rate_limited`);
    }
    throw error;
  }

  const built = buildAuthorizationUrl(provider);
  if (!built) {
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_not_configured`);
  }

  const referralCode = request.nextUrl.searchParams.get("ref");
  const response = NextResponse.redirect(built.url);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
  response.cookies.set("oauth_state", built.state, cookieOptions);
  if (built.codeVerifier) {
    response.cookies.set("oauth_code_verifier", built.codeVerifier, cookieOptions);
  }
  if (referralCode) {
    response.cookies.set("oauth_ref", referralCode, cookieOptions);
  }

  return response;
}
