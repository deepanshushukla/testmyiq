import { type NextRequest, NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/auth/verification";
import { AuthError } from "@/lib/auth/errors";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const token = request.nextUrl.searchParams.get("token");
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/verify?error=missing_token`);
  }

  try {
    await enforceRateLimit(`verify-magic-link:ip:${ip}`, 30, 15 * 60);

    const user = await consumeMagicLink(token);
    const { rawToken, expiresAt } = await createSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ipAddress: ip,
    });
    await setSessionCookie(rawToken, expiresAt);

    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.redirect(`${baseUrl}/verify?error=rate_limited`);
    }
    if (error instanceof AuthError) {
      return NextResponse.redirect(`${baseUrl}/verify?error=${error.code}`);
    }
    console.error(error);
    return NextResponse.redirect(`${baseUrl}/verify?error=internal_error`);
  }
}
