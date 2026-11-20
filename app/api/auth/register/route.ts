import { NextResponse, type NextRequest } from "next/server";
import { registerUser } from "@/lib/auth/registration";
import { registerSchema } from "@/lib/auth/schemas";
import { AuthError } from "@/lib/auth/errors";
import { getEmailProvider } from "@/lib/email";
import { buildVerificationEmail } from "@/lib/email/templates";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const json = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { email, displayName, referralCode } = parsed.data;

  try {
    await enforceRateLimit(`register:ip:${ip}`, 5, 60 * 60);
    await enforceRateLimit(`register:email:${email.toLowerCase()}`, 3, 60 * 60);

    const { user, rawCode, rawToken, expiresAt } = await registerUser({
      email,
      displayName,
      referralCode,
      registrationIp: ip,
    });

    const appName = process.env.APP_NAME ?? "Cognitive Assessment Platform";
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const magicLinkUrl = `${baseUrl}/api/auth/verify-magic-link?token=${rawToken}`;

    await getEmailProvider().send({
      to: user.email,
      ...buildVerificationEmail({ code: rawCode, magicLinkUrl, appName }),
    });

    return NextResponse.json({ status: "verification_sent", email: user.email, expiresAt });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
