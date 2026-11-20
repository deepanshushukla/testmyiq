/**
 * Presentational tier for the results-page headline — never a clinical
 * claim. Default bands here; Part 9 says these should be admin-
 * configurable via system_settings eventually, not yet wired up.
 */
export type PerformanceBand = { min: number; max: number; label: string };

export const DEFAULT_PERFORMANCE_BANDS: PerformanceBand[] = [
  { min: 0, max: 50, label: "Developing" },
  { min: 50, max: 100, label: "Solid" },
  { min: 100, max: 150, label: "Strong" },
  { min: 150, max: 200, label: "Exceptional" },
];

export function getPerformanceLabel(
  estimatedScore: number,
  bands: PerformanceBand[] = DEFAULT_PERFORMANCE_BANDS,
): string {
  const band = bands.find((candidate) => estimatedScore >= candidate.min && estimatedScore < candidate.max);
  return band?.label ?? bands[bands.length - 1]?.label ?? "Unrated";
}
