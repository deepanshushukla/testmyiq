import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth/guards";
import { ShareError } from "@/lib/sharing/errors";

export function handleShareRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof ShareError) {
    const status =
      error.code === "forbidden"
        ? 403
        : error.code === "not_found"
          ? 404
          : error.code === "not_unlocked"
            ? 409
            : 400;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
