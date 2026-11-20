"use server";

import { revalidatePath } from "next/cache";
import { assertAuthenticated, getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";

/**
 * docs/ARCHITECTURE.md §3: "Server Actions are allowed only for low-risk,
 * purely-UI mutations (e.g., toggling leaderboard visibility) where the
 * same authorization checks still apply server-side" — this is that
 * named example. `assertAuthenticated` still runs here even though the
 * toggle UI only renders for a logged-in user; the server never trusts
 * that the client enforced it.
 */
export async function setLeaderboardVisibility(optIn: boolean): Promise<void> {
  const user = assertAuthenticated(await getCurrentUser());
  await prisma.user.update({
    where: { id: user.id },
    data: { publicLeaderboardOptIn: optIn },
  });
  revalidatePath("/dashboard");
}
