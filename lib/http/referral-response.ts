import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/guards";
import { ReferralError } from "@/lib/referrals/errors";

export function handleReferralRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (error instanceof ReferralError) {
    const status = error.code === "not_found" ? 404 : 400;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
