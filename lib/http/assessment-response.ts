import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/auth/guards";
import { AssessmentError } from "@/lib/assessment/errors";

export function handleAssessmentRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (error instanceof AssessmentError) {
    const status =
      error.code === "forbidden"
        ? 403
        : error.code === "not_found"
          ? 404
          : error.code === "expired" || error.code === "not_submitted"
            ? 409
            : 400;
    return NextResponse.json({ error: error.code, message: error.message }, { status });
  }
  console.error(error);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
