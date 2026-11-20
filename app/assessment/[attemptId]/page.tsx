import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/guards";
import { getAssessmentState } from "@/lib/assessment/state";
import { AssessmentError } from "@/lib/assessment/errors";
import { getGamificationSummary } from "@/lib/gamification/summary";
import { QuizRunner } from "@/components/assessment/QuizRunner";

export const metadata: Metadata = {
  title: "Assessment",
  robots: { index: false, follow: false },
};

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { attemptId } = await params;

  let state: Awaited<ReturnType<typeof getAssessmentState>>;
  try {
    state = await getAssessmentState(attemptId, user.id);
  } catch (error) {
    if (error instanceof AssessmentError && (error.code === "not_found" || error.code === "forbidden")) {
      redirect("/dashboard");
    }
    throw error;
  }

  // Purely a motivational display on the quiz page itself — never used
  // for scoring or unlock logic, so a plain server-side read is enough;
  // no need for the live attempt to push updates into it mid-quiz.
  const { xpTotal } = await getGamificationSummary(user.id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <QuizRunner
        attemptId={state.attemptId}
        expiresAt={state.expiresAt!.toISOString()}
        initialStatus={state.status}
        initialQuestions={state.questions}
        initialXpTotal={xpTotal}
      />
    </main>
  );
}
