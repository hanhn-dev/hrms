/**
 * Text the search box should show.
 * A focused box keeps what the user typed so a late result cannot move the caret.
 */
export function searchInputValue(typed: string, applied: string, focused: boolean): string {
  if (focused) {
    return typed;
  }
  return applied;
}

/** Value to send to the server, or null when the keystroke should not navigate. */
export function serverSearchChanged(next: string, applied: string): string | null {
  const trimmed = next.trim();
  if (trimmed.length === 1) {
    return null;
  }
  if (trimmed === applied.trim()) {
    return null;
  }
  return trimmed;
}
