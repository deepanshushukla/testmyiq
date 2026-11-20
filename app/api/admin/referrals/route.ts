import { NextResponse } from "next/server";
import { assertAdmin, getCurrentUser } from "@/lib/auth/guards";
import { listReferralsForAdmin } from "@/lib/referrals/admin";
import { handleReferralRouteError } from "@/lib/http/referral-response";

export async function GET() {
  try {
    assertAdmin(await getCurrentUser());
    const referrals = await listReferralsForAdmin();
    return NextResponse.json({ referrals });
  } catch (error) {
    return handleReferralRouteError(error);
  }
}
