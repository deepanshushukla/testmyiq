import { NextResponse } from "next/server";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { getAssessmentState } from "@/lib/assessment/state";
import { handleAssessmentRouteError } from "@/lib/http/assessment-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const { attemptId } = await params;

    const state = await getAssessmentState(attemptId, user.id);
    return NextResponse.json(state);
  } catch (error) {
    return handleAssessmentRouteError(error);
  }
}
