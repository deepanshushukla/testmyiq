import type { Metadata } from "next";
import { BulkImportForm } from "./BulkImportForm";

export const metadata: Metadata = {
  title: "Bulk import questions",
  robots: { index: false, follow: false },
};

export default function BulkImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Bulk import questions</h1>
      <p className="text-neutral-600">Paste a JSON array of question objects below.</p>
      <BulkImportForm />
    </div>
  );
}
