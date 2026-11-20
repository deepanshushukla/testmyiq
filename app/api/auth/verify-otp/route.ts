import { NextResponse, type NextRequest } from "next/server";
import { consumeOtp } from "@/lib/auth/verification";
import { verifyOtpSchema } from "@/lib/auth/schemas";
import { AuthError } from "@/lib/auth/errors";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const json = await request.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { email, code } = parsed.data;

  try {
    await enforceRateLimit(`verify-otp:ip:${ip}`, 20, 15 * 60);
    await enforceRateLimit(`verify-otp:email:${email.toLowerCase()}`, 10, 15 * 60);

    const user = await consumeOtp(email, code);
    const { rawToken, expiresAt } = await createSession(user.id, {
      userAgent: request.headers.get("user-agent"),
      ipAddress: ip,
    });
    await setSessionCookie(rawToken, expiresAt);

    return NextResponse.json({ status: "verified", userId: user.id });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
