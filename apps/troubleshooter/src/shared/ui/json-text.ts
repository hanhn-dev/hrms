export type JsonParseResult =
  | { ok: true; value: unknown; compact: string | null }
  | { ok: false; error: string };

export function formatJsonForEdit(input: string | null | undefined): string {
  if (input == null || input.trim() === "") {
    return "";
  }
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}

export function parseJsonText(input: string): JsonParseResult {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: true, value: null, compact: null };
  }
  try {
    const value = JSON.parse(trimmed) as unknown;
    return { ok: true, value, compact: JSON.stringify(value) };
  } catch {
    return { ok: false, error: "JSON is malformed." };
  }
}

export function compactJson(value: unknown): string {
  return JSON.stringify(value);
}
