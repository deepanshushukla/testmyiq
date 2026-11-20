import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { assertAdmin, getCurrentUser } from "@/lib/auth/guards";
import { disqualifyReferral } from "@/lib/referrals/admin";
import { handleReferralRouteError } from "@/lib/http/referral-response";

const bodySchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = assertAdmin(await getCurrentUser());
    const { id } = await params;

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const qualification = await disqualifyReferral(id, admin.id, parsed.data.reason);
    return NextResponse.json({ qualification });
  } catch (error) {
    return handleReferralRouteError(error);
  }
}
