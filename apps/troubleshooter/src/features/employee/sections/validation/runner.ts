import { LOCAL_VALIDATORS, compareTo, type LocalValidator } from "./rules.ts";
import {
  LOCAL_CROSS_FIELD_RULES,
  RULE_NAMES,
  SERVER_DB_RULES,
  SKIPPED_CONTEXTUAL_RULES,
  classifyRule,
  type FieldError,
  type RowValidationResult,
  type SectionFieldDef,
  type ValidationResult,
  type ValidationRuleEntry,
} from "./types.ts";

function truthyMandatory(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}

export function parseRules(
  raw: string | ValidationRuleEntry[] | null | undefined,
): ValidationRuleEntry[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ValidationRuleEntry =>
        item != null &&
        typeof item === "object" &&
        typeof (item as ValidationRuleEntry).rule === "string",
    );
  } catch {
    return [];
  }
}

export function buildValidationRule(field: SectionFieldDef): {
  fieldName: string;
  shouldValidate: boolean;
  rules: ValidationRuleEntry[];
} {
  const fieldName = field.displayText;
  let rules = parseRules(field.validationRule);

  if (truthyMandatory(field.isMandatory)) {
    if (!rules.some((r) => r.rule === RULE_NAMES.REQUIRED)) {
      rules = [
        ...rules,
        {
          rule: RULE_NAMES.REQUIRED,
          errorMessage: "This field can't be empty.",
        },
      ];
    }
  } else {
    rules = rules.filter((r) => r.rule !== RULE_NAMES.REQUIRED);
  }

  return {
    fieldName,
    shouldValidate: rules.length > 0,
    rules,
  };
}

function runSingleRuleSync(
  row: Record<string, unknown>,
  value: unknown,
  entry: ValidationRuleEntry,
): ValidationResult {
  const { rule, params = {}, errorMessage } = entry;
  const classified = classifyRule(rule);

  if (
    classified.capability === "skippedContextual" ||
    classified.capability === "serverDb"
  ) {
    return [true, null];
  }
  if (classified.capability === "unsupported") {
    return [
      false,
      `Validation configuration for field is invalid — unsupported rule '${rule}'. Please contact an administrator.`,
    ];
  }

  if (rule === RULE_NAMES.DEPENDENT) {
    const dependsOn = params.dependsOn as string | undefined;
    const addRulesIfValue = params.addRulesIfValue as
      | Record<string, ValidationRuleEntry[]>
      | undefined;
    if (!dependsOn || !addRulesIfValue) return [true, null];
    const dependsOnValue = String(row[dependsOn] ?? "");
    for (const pattern of Object.keys(addRulesIfValue)) {
      let regex: RegExp;
      try {
        regex = new RegExp(pattern);
      } catch {
        return [false, "Invalid dependent rule structure"];
      }
      if (!regex.test(dependsOnValue)) continue;
      const subRules = addRulesIfValue[pattern];
      if (!Array.isArray(subRules)) {
        return [false, "Invalid dependent rule structure"];
      }
      for (const sub of subRules) {
        if (!sub || typeof sub !== "object") continue;
        const subResult = runSingleRuleSync(row, value, sub);
        if (!subResult[0]) {
          return [false, subResult[1] ?? sub.errorMessage ?? null];
        }
      }
    }
    return [true, null];
  }

  if (rule === RULE_NAMES.COMPARE_TO) {
    const validator = compareTo(row);
    const result = validator(value, params as Parameters<typeof validator>[1]);
    if (!result[0]) return [false, result[1] ?? errorMessage ?? null];
    return [true, null];
  }

  const validator = LOCAL_VALIDATORS[rule];
  if (!validator || typeof validator !== "function") {
    return [
      false,
      `Validation configuration for field is invalid — unsupported rule '${rule}'. Please contact an administrator.`,
    ];
  }
  if (LOCAL_CROSS_FIELD_RULES.has(rule) && rule !== RULE_NAMES.COMPARE_TO) {
    return [true, null];
  }
  const result = (validator as LocalValidator)(value, params);
  if (result instanceof Promise) {
    return [false, "Async validators are not supported inline."];
  }
  if (!result[0]) return [false, result[1] ?? errorMessage ?? null];
  return [true, null];
}

export function validateRow(
  row: Record<string, unknown>,
  fields: SectionFieldDef[],
): RowValidationResult {
  const errorMap = new Map<string, string[]>();
  const skippedRules = new Set<string>();

  for (const field of fields) {
    const built = buildValidationRule(field);
    if (!built.shouldValidate) continue;
    const value = row[built.fieldName];

    for (const entry of built.rules) {
      const classified = classifyRule(entry.rule);
      if (
        classified.capability === "skippedContextual" ||
        classified.capability === "serverDb"
      ) {
        skippedRules.add(entry.rule);
        continue;
      }

      const result = runSingleRuleSync(row, value, entry);
      if (!result[0]) {
        const list = errorMap.get(built.fieldName) ?? [];
        list.push(
          result[1] ||
            entry.errorMessage ||
            `Invalid value for ${built.fieldName}.`,
        );
        errorMap.set(built.fieldName, list);
      }
    }
  }

  const errorFields: FieldError[] = Array.from(errorMap.entries()).map(
    ([fieldName, errors]) => ({ fieldName, errors }),
  );

  return {
    isValid: errorFields.length === 0,
    errorFields,
    skippedRules: Array.from(skippedRules).sort(),
  };
}

export function errorsForField(
  result: RowValidationResult,
  fieldName: string,
): string[] {
  return (
    result.errorFields.find((e) => e.fieldName === fieldName)?.errors ?? []
  );
}

export { SERVER_DB_RULES, SKIPPED_CONTEXTUAL_RULES };
