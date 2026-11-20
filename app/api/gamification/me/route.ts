import { NextResponse } from "next/server";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { getGamificationSummary } from "@/lib/gamification/summary";
import { handleGamificationRouteError } from "@/lib/http/gamification-response";

export async function GET() {
  try {
    const user = assertAuthenticated(await getCurrentUser());
    const summary = await getGamificationSummary(user.id);
    return NextResponse.json(summary);
  } catch (error) {
    return handleGamificationRouteError(error);
  }
}
