import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin, getCurrentUser } from "@/lib/auth/guards";
import { publishQuestion } from "@/lib/admin/questions";
import { handleAdminRouteError } from "@/lib/http/admin-response";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertAdmin(await getCurrentUser());
    const { id } = await params;

    const question = await publishQuestion(id);
    return NextResponse.json({ question });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
