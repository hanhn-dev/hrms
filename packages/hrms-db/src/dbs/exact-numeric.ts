/** Canonical numeric literal. Padded digit strings such as `00006` stay strings. */
export function parseExactNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
