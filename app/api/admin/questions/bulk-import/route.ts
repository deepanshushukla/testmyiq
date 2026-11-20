import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin, getCurrentUser } from "@/lib/auth/guards";
import { bulkImportQuestions } from "@/lib/admin/questions";
import { handleAdminRouteError } from "@/lib/http/admin-response";

export async function POST(request: NextRequest) {
  try {
    assertAdmin(await getCurrentUser());

    const json = await request.json().catch(() => null);
    if (!Array.isArray(json)) {
      return NextResponse.json(
        { error: "invalid_input", message: "Expected a JSON array of questions" },
        { status: 400 },
      );
    }

    const report = await bulkImportQuestions(json);
    return NextResponse.json(report);
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
