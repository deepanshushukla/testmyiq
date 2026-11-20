import { NextResponse } from "next/server";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { submitAssessment } from "@/lib/assessment/submit";
import { handleAssessmentRouteError } from "@/lib/http/assessment-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const { attemptId } = await params;

    const assessment = await submitAssessment(attemptId, user.id);
    return NextResponse.json({ attemptId: assessment.id, status: assessment.status });
  } catch (error) {
    return handleAssessmentRouteError(error);
  }
}
