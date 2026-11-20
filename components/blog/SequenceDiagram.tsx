/** Small, dependency-free visual aid for number/pattern sequence articles
 * — plain HTML boxes rather than an image asset, so the "diagram" is real
 * text (good for accessibility and for crawlers alike), not a raster
 * image needing alt text and a CDN. */
export function SequenceDiagram({ items }: { items: (string | number)[] }) {
  return (
    <div className="my-4 flex flex-wrap items-center gap-2" role="group" aria-label={`Sequence: ${items.join(", ")}`}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-semibold ${
              item === "?"
                ? "border-dashed border-brand-400 text-brand-600"
                : "border-neutral-300 bg-neutral-50 text-neutral-900"
            }`}
          >
            {item}
          </span>
          {index < items.length - 1 && <span aria-hidden="true" className="text-neutral-400">→</span>}
        </span>
      ))}
    </div>
  );
}
