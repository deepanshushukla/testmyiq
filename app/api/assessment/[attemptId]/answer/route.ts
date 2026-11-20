import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { submitAnswer } from "@/lib/assessment/answer";
import { handleAssessmentRouteError } from "@/lib/http/assessment-response";

const bodySchema = z.object({
  assessmentQuestionId: z.string().uuid(),
  selectedOptionId: z.string().uuid().nullable().optional(),
  markedForReview: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const { attemptId } = await params;

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { assessmentQuestionId, selectedOptionId, markedForReview } = parsed.data;
    await submitAnswer(attemptId, user.id, assessmentQuestionId, {
      selectedOptionId,
      markedForReview,
    });

    return NextResponse.json({ status: "saved" });
  } catch (error) {
    return handleAssessmentRouteError(error);
  }
}
