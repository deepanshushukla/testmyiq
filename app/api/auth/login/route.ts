import { NextResponse, type NextRequest } from "next/server";
import { requestLoginCode } from "@/lib/auth/login";
import { loginSchema } from "@/lib/auth/schemas";
import { getEmailProvider } from "@/lib/email";
import { buildVerificationEmail } from "@/lib/email/templates";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const json = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  try {
    await enforceRateLimit(`login:ip:${ip}`, 10, 60 * 60);
    await enforceRateLimit(`login:email:${email}`, 5, 60 * 60);

    const result = await requestLoginCode(email);

    if (result) {
      const appName = process.env.APP_NAME ?? "Cognitive Assessment Platform";
      const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
      const magicLinkUrl = `${baseUrl}/api/auth/verify-magic-link?token=${result.rawToken}`;

      await getEmailProvider().send({
        to: result.user.email,
        ...buildVerificationEmail({ code: result.rawCode, magicLinkUrl, appName }),
      });
    }

    // Identical response whether or not the account exists, to avoid
    // leaking which emails are registered.
    return NextResponse.json({ status: "verification_sent_if_account_exists" });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
