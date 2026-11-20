import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/guards";
import { getResultForUser } from "@/lib/results/access";
import { AssessmentError } from "@/lib/assessment/errors";
import { prisma } from "@/lib/db/client";
import { getOrCreateReferralCode } from "@/lib/referrals/code";
import { getReferralProgress } from "@/lib/referrals/progress";
import { LockedResult } from "@/components/results/LockedResult";
import { FullResult } from "@/components/results/FullResult";

export const metadata: Metadata = {
  title: "Your results",
  robots: { index: false, follow: false },
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { attemptId } = await params;

  let result;
  try {
    result = await getResultForUser(attemptId, user.id);
  } catch (error) {
    if (error instanceof AssessmentError) {
      if (error.code === "not_found" || error.code === "forbidden") {
        redirect("/dashboard");
      }
      if (error.code === "not_submitted") {
        redirect(`/assessment/${attemptId}`);
      }
    }
    throw error;
  }

  if (result.status === "locked") {
    const [referralCode, referralProgress] = await Promise.all([
      getOrCreateReferralCode(user.id),
      getReferralProgress(user.id),
    ]);

    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <LockedResult
          result={result}
          assessmentId={attemptId}
          referralCode={referralCode}
          referralProgress={referralProgress}
        />
      </main>
    );
  }

  const categories = await prisma.questionCategory.findMany({ select: { id: true, name: true } });
  const categoryNames = Object.fromEntries(categories.map((category) => [category.id, category.name]));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <FullResult result={result} categoryNames={categoryNames} assessmentId={attemptId} />
    </main>
  );
}
