import { NextResponse } from "next/server";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { getResultForUser } from "@/lib/results/access";
import { handleAssessmentRouteError } from "@/lib/http/assessment-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const { attemptId } = await params;

    const result = await getResultForUser(attemptId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleAssessmentRouteError(error);
  }
}
