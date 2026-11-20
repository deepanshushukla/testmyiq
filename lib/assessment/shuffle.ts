/** Fisher-Yates. Used only for UX randomization (question/option order),
 * never for anything security-sensitive — Math.random is fine here. */
export function shuffle<T>(items: T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
