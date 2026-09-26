export const VALIDATION_RULE_MAX_LENGTH = 1000;

export type ValidationRuleParseResult =
  | { ok: true; compact: string | null; parsed: unknown[] | null }
  | { ok: false; error: string };

export function validateValidationRuleValue(
  parsed: unknown,
): ValidationRuleParseResult {
  if (parsed == null) {
    return { ok: true, compact: null, parsed: null };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: "ValidationRule JSON must be an array." };
  }
  for (const item of parsed) {
    if (item == null || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Each ValidationRule item must be an object." };
    }
  }
  const compact = JSON.stringify(parsed);
  if (compact.length > VALIDATION_RULE_MAX_LENGTH) {
    return {
      ok: false,
      error: `ValidationRule must be at most ${VALIDATION_RULE_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, compact, parsed };
}

export function parseValidationRuleJson(
  input: string | null | undefined,
): ValidationRuleParseResult {
  const trimmed = input?.trim() ?? "";
  if (trimmed === "") {
    return { ok: true, compact: null, parsed: null };
  }
  try {
    return validateValidationRuleValue(JSON.parse(trimmed) as unknown);
  } catch {
    return { ok: false, error: "ValidationRule JSON is malformed." };
  }
}
