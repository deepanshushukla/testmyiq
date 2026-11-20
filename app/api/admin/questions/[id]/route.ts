import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin, getCurrentUser } from "@/lib/auth/guards";
import { archiveQuestion, getQuestion, updateQuestion } from "@/lib/admin/questions";
import { questionUpdateSchema } from "@/lib/admin/schemas";
import { handleAdminRouteError } from "@/lib/http/admin-response";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    assertAdmin(await getCurrentUser());
    const { id } = await params;

    const question = await getQuestion(id);
    if (!question) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ question });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    assertAdmin(await getCurrentUser());
    const { id } = await params;

    const json = await request.json().catch(() => null);
    const parsed = questionUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const question = await updateQuestion(id, parsed.data);
    return NextResponse.json({ question });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

// Soft-delete only — sets status ARCHIVED, never a hard delete (docs/API.md §7).
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    assertAdmin(await getCurrentUser());
    const { id } = await params;

    const question = await archiveQuestion(id);
    return NextResponse.json({ question });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
