"use client";

import { useState, type FormEvent } from "react";
import { Button, Card } from "@/components/ui";

type Report = { created: string[]; errors: { index: number; message: string }[] };

export function BulkImportForm() {
  const [input, setInput] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParseError(null);
    setReport(null);

    let rows: unknown;
    try {
      rows = JSON.parse(input);
    } catch {
      setParseError("That's not valid JSON.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/admin/questions/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
    });
    const data: Report = await response.json();
    setSubmitting(false);
    setReport(data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        rows={12}
        placeholder='[{"questionText": "...", "difficulty": "EASY", ...}]'
        className="rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm"
      />
      {parseError ? <p className="text-sm text-red-600">{parseError}</p> : null}
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Importing…" : "Import"}
        </Button>
      </div>
      {report ? (
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-neutral-700">
            Created {report.created.length} question(s), {report.errors.length} error(s).
          </p>
          {report.errors.map((err) => (
            <p key={err.index} className="text-sm text-red-600">
              Row {err.index}: {err.message}
            </p>
          ))}
        </Card>
      ) : null}
    </form>
  );
}
