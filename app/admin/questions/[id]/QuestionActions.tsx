"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function QuestionActions({
  questionId,
  status,
}: {
  questionId: string;
  status: string;
}) {
  const router = useRouter();

  async function publish() {
    await fetch(`/api/admin/questions/${questionId}/publish`, { method: "POST" });
    router.refresh();
  }

  async function archive() {
    await fetch(`/api/admin/questions/${questionId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
        {status}
      </span>
      {status === "DRAFT" ? (
        <Button variant="secondary" onClick={publish}>
          Publish
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button variant="ghost" onClick={archive}>
          Archive
        </Button>
      ) : null}
    </div>
  );
}
