import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { getQuestion } from "@/lib/admin/questions";
import { QuestionForm } from "../QuestionForm";
import { QuestionActions } from "./QuestionActions";

export const metadata: Metadata = {
  title: "Edit question",
  robots: { index: false, follow: false },
};

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [question, categories] = await Promise.all([
    getQuestion(id),
    prisma.questionCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!question) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Edit question</h1>
        <QuestionActions questionId={question.id} status={question.status} />
      </div>
      <QuestionForm
        categories={categories}
        mode="edit"
        questionId={question.id}
        initial={{
          questionText: question.questionText,
          difficulty: question.difficulty,
          categorySlug: question.category.slug,
          explanation: question.explanation,
          expectedSolvingTimeSeconds: question.expectedSolvingTimeSeconds,
          scoringWeight: Number(question.scoringWeight),
          kind: question.kind,
          stimulusQuestionId: question.stimulusQuestionId,
          options: question.options.map((option) => ({
            label: option.label,
            optionText: option.optionText,
            isCorrect: option.isCorrect,
          })),
        }}
      />
    </div>
  );
}
