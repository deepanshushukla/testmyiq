import Link from "next/link";
import type { Metadata } from "next";
import { listQuestions } from "@/lib/admin/questions";
import { Button, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Questions",
  robots: { index: false, follow: false },
};

export default async function AdminQuestionsPage() {
  const questions = await listQuestions({});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Questions</h1>
        <div className="flex gap-3">
          <Link href="/admin/questions/bulk-import">
            <Button variant="secondary">Bulk import</Button>
          </Link>
          <Link href="/admin/questions/new">
            <Button>New question</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {questions.map((question) => (
          <Card key={question.id} className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-neutral-900">{question.questionText}</p>
              <p className="text-sm text-neutral-500">
                {question.category.name} · {question.difficulty} · {question.status}
                {question.kind !== "STANDARD" ? ` · ${question.kind}` : ""}
              </p>
              {question.kind === "STIMULUS" ? (
                <p className="font-mono text-xs text-neutral-400">id: {question.id}</p>
              ) : null}
            </div>
            <Link href={`/admin/questions/${question.id}`}>
              <Button variant="secondary">Edit</Button>
            </Link>
          </Card>
        ))}
        {questions.length === 0 ? <p className="text-neutral-500">No questions yet.</p> : null}
      </div>
    </div>
  );
}
