import { NextResponse } from "next/server";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { startOrResumeAssessment } from "@/lib/assessment/start";
import { handleAssessmentRouteError } from "@/lib/http/assessment-response";

export async function POST() {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const assessment = await startOrResumeAssessment(user.id);

    return NextResponse.json({
      attemptId: assessment.id,
      status: assessment.status,
      startedAt: assessment.startedAt,
      expiresAt: assessment.expiresAt,
    });
  } catch (error) {
    return handleAssessmentRouteError(error);
  }
}
