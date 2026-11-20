import { NextResponse } from "next/server";
import { revokeSession } from "@/lib/auth/session";
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/cookies";

export async function POST() {
  const rawToken = await readSessionCookie();

  if (rawToken) {
    await revokeSession(rawToken);
  }
  await clearSessionCookie();

  return NextResponse.json({ status: "logged_out" });
}
