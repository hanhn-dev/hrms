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
