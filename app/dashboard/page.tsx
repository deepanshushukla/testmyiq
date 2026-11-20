import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { readSessionCookie } from "@/lib/auth/cookies";
import { prisma } from "@/lib/db/client";
import { Button, Card } from "@/components/ui";
import { getGamificationSummary } from "@/lib/gamification/summary";
import { GamificationPanel } from "@/components/gamification/GamificationPanel";
import { LogoutButton } from "./LogoutButton";
import { StartAssessmentButton } from "./StartAssessmentButton";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const rawToken = await readSessionCookie();
  const user = await getSessionUser(rawToken);

  if (!user) {
    redirect("/login");
  }

  const inProgress = await prisma.assessment.findFirst({
    where: { userId: user.id, status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" },
  });

  const lastCompleted = inProgress
    ? null
    : await prisma.assessment.findFirst({
        where: { userId: user.id, status: { in: ["SUBMITTED", "EXPIRED"] } },
        orderBy: { createdAt: "desc" },
      });

  const gamificationSummary = await getGamificationSummary(user.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Welcome{user.displayName ? `, ${user.displayName}` : ""}
      </h1>
      <Card className="flex flex-col gap-3">
        <p className="text-neutral-600">Signed in as {user.email}</p>
        <p className="text-neutral-600">
          {user.isFreeTierEligible
            ? "You're one of our first 10 verified users — your results will be free."
            : "Unlock your results instantly for $1, or invite two friends to unlock for free."}
        </p>
        {inProgress ? (
          <Link href={`/assessment/${inProgress.id}`}>
            <Button variant="primary">Resume assessment</Button>
          </Link>
        ) : (
          <StartAssessmentButton />
        )}
        {lastCompleted ? (
          <Link href={`/results/${lastCompleted.id}`}>
            <Button variant="secondary">View my last results</Button>
          </Link>
        ) : null}
        <LogoutButton />
      </Card>
      <GamificationPanel summary={gamificationSummary} publicLeaderboardOptIn={user.publicLeaderboardOptIn} />
    </main>
  );
}
