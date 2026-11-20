import { APP_NAME } from "@/lib/seo/constants";

/**
 * Pre-unlock invitation copy. Deliberately takes no score/result input at
 * all — not just "doesn't read it," the function signature makes it
 * impossible to pass one in, so a future edit can't accidentally leak a
 * hidden score into the generic invite (requirement.txt Part 8: "never
 * reveal the hidden score" before unlock).
 */
export function buildPreUnlockShareText(): string {
  return `I just took a cognitive assessment on ${APP_NAME} — think you can beat me? Try it free.`;
}

/** Post-unlock share copy links to the public card; the score itself is
 * only ever shown on that page, gated by the owner's visibility settings. */
export function buildUnlockedShareText(): string {
  return `I just got my results on ${APP_NAME}. See my cognitive assessment card and take the test yourself:`;
}
