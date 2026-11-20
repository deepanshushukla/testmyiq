import { NextResponse } from "next/server";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { getOrCreateReferralCode } from "@/lib/referrals/code";
import { handleReferralRouteError } from "@/lib/http/referral-response";

export async function GET() {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const code = await getOrCreateReferralCode(user.id);
    return NextResponse.json({ code });
  } catch (error) {
    return handleReferralRouteError(error);
  }
}
