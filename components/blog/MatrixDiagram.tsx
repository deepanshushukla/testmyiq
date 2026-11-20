/** Renders a small grid for matrix-reasoning examples — same
 * plain-HTML-over-image approach as SequenceDiagram. */
export function MatrixDiagram({ rows }: { rows: string[][] }) {
  return (
    <div
      className="my-4 inline-grid gap-2"
      style={{ gridTemplateColumns: `repeat(${rows[0]?.length ?? 1}, minmax(0, 1fr))` }}
      role="group"
      aria-label="Matrix reasoning grid"
    >
      {rows.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <span
            key={`${rowIndex}-${colIndex}`}
            className={`flex h-14 w-14 items-center justify-center rounded-lg border text-sm font-medium ${
              cell === "?"
                ? "border-dashed border-brand-400 text-brand-600"
                : "border-neutral-300 bg-neutral-50 text-neutral-900"
            }`}
          >
            {cell}
          </span>
        )),
      )}
    </div>
  );
}
