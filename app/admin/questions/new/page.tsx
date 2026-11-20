import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { QuestionForm } from "../QuestionForm";

export const metadata: Metadata = {
  title: "New question",
  robots: { index: false, follow: false },
};

export default async function NewQuestionPage() {
  const categories = await prisma.questionCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">New question</h1>
      <QuestionForm categories={categories} mode="create" />
    </div>
  );
}
