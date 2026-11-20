import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin, getCurrentUser } from "@/lib/auth/guards";
import { createQuestion, listQuestions } from "@/lib/admin/questions";
import { questionInputSchema } from "@/lib/admin/schemas";
import { handleAdminRouteError } from "@/lib/http/admin-response";

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export async function GET(request: NextRequest) {
  try {
    assertAdmin(await getCurrentUser());

    const statusParam = request.nextUrl.searchParams.get("status");
    const difficultyParam = request.nextUrl.searchParams.get("difficulty");

    const status = STATUSES.find((value) => value === statusParam);
    const difficulty = DIFFICULTIES.find((value) => value === difficultyParam);

    const questions = await listQuestions({ status, difficulty });
    return NextResponse.json({ questions });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertAdmin(await getCurrentUser());

    const json = await request.json().catch(() => null);
    const parsed = questionInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const question = await createQuestion(parsed.data);
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    return handleAdminRouteError(error);
  }
}
