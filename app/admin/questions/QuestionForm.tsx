"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";

type Category = { id: string; name: string; slug: string };
type OptionDraft = { label: string; optionText: string; isCorrect: boolean };
type QuestionKind = "STANDARD" | "STIMULUS" | "RECALL";

type QuestionFormProps = {
  categories: Category[];
  mode: "create" | "edit";
  questionId?: string;
  initial?: {
    questionText: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    categorySlug: string;
    explanation: string;
    expectedSolvingTimeSeconds: number;
    scoringWeight: number;
    kind: QuestionKind;
    stimulusQuestionId: string | null;
    options: OptionDraft[];
  };
};

const DEFAULT_OPTIONS: OptionDraft[] = [
  { label: "A", optionText: "", isCorrect: true },
  { label: "B", optionText: "", isCorrect: false },
  { label: "C", optionText: "", isCorrect: false },
  { label: "D", optionText: "", isCorrect: false },
];

export function QuestionForm({ categories, mode, questionId, initial }: QuestionFormProps) {
  const router = useRouter();

  const [questionText, setQuestionText] = useState(initial?.questionText ?? "");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">(
    initial?.difficulty ?? "EASY",
  );
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? categories[0]?.slug ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [expectedSolvingTimeSeconds, setExpectedSolvingTimeSeconds] = useState(
    initial?.expectedSolvingTimeSeconds ?? 60,
  );
  const [scoringWeight, setScoringWeight] = useState(initial?.scoringWeight ?? 1.5);
  const [kind, setKind] = useState<QuestionKind>(initial?.kind ?? "STANDARD");
  const [stimulusQuestionId, setStimulusQuestionId] = useState(initial?.stimulusQuestionId ?? "");
  const [options, setOptions] = useState<OptionDraft[]>(initial?.options ?? DEFAULT_OPTIONS);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  }

  function setCorrectIndex(index: number) {
    setOptions((prev) => prev.map((option, i) => ({ ...option, isCorrect: i === index })));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      questionText,
      difficulty,
      categorySlug,
      explanation,
      expectedSolvingTimeSeconds: Number(expectedSolvingTimeSeconds),
      scoringWeight: Number(scoringWeight),
      kind,
      stimulusQuestionId: kind === "RECALL" ? stimulusQuestionId : undefined,
      options: kind === "STIMULUS" ? [] : options,
    };

    const url = mode === "create" ? "/api/admin/questions" : `/api/admin/questions/${questionId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (response.ok) {
      router.push("/admin/questions");
      router.refresh();
      return;
    }

    const data: { message?: string } | null = await response.json().catch(() => null);
    setError(data?.message ?? "Something went wrong. Please check the form and try again.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Question kind</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as QuestionKind)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="STANDARD">Standard — a normal scored question</option>
            <option value="STIMULUS">Stimulus — a non-scored &quot;memorize this&quot; screen</option>
            <option value="RECALL">Recall — a scored question about an earlier stimulus</option>
          </select>
        </label>

        {kind === "RECALL" ? (
          <Input
            label="Stimulus question ID"
            required
            value={stimulusQuestionId}
            onChange={(event) => setStimulusQuestionId(event.target.value)}
          />
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Question text</span>
          <textarea
            required
            value={questionText}
            onChange={(event) => setQuestionText(event.target.value)}
            rows={3}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-700">Difficulty</span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as "EASY" | "MEDIUM" | "HARD")}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-700">Category</span>
            <select
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Expected solving time (seconds)"
            type="number"
            min={1}
            value={expectedSolvingTimeSeconds}
            onChange={(event) => setExpectedSolvingTimeSeconds(Number(event.target.value))}
          />
          <Input
            label="Scoring weight"
            type="number"
            step="0.1"
            min={0}
            value={scoringWeight}
            onChange={(event) => setScoringWeight(Number(event.target.value))}
            disabled={kind === "STIMULUS"}
          />
        </div>
      </Card>

      {kind === "STIMULUS" ? (
        <Card className="flex flex-col gap-2 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Stimulus screens have no options — they&apos;re shown, not scored. Create the paired
            recall question separately and reference this question&apos;s ID as its stimulus.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-700">Options (select the correct one)</h2>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-3">
              <input
                type="radio"
                name="correct-option"
                checked={option.isCorrect}
                onChange={() => setCorrectIndex(index)}
                aria-label={`Mark option ${option.label} correct`}
              />
              <input
                value={option.label}
                onChange={(event) => updateOption(index, { label: event.target.value })}
                className="w-16 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                aria-label={`Option ${index + 1} label`}
              />
              <input
                required
                value={option.optionText}
                onChange={(event) => updateOption(index, { optionText: event.target.value })}
                className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm"
                aria-label={`Option ${index + 1} text`}
              />
            </div>
          ))}
        </Card>
      )}

      <Card className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-700">Explanation</span>
          <textarea
            required
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            rows={2}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </label>
      </Card>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create question" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
