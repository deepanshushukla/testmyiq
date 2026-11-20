import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { readSessionCookie } from "@/lib/auth/cookies";

export async function GET() {
  const rawToken = await readSessionCookie();
  const user = await getSessionUser(rawToken);

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isFreeTierEligible: user.isFreeTierEligible,
  });
}
