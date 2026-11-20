import { NextResponse } from "next/server";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { getReferralProgress } from "@/lib/referrals/progress";
import { handleReferralRouteError } from "@/lib/http/referral-response";

export async function GET() {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const progress = await getReferralProgress(user.id);
    return NextResponse.json(progress);
  } catch (error) {
    return handleReferralRouteError(error);
  }
}
