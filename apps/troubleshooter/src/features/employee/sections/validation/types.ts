export type ValidationResult = [ok: boolean, message?: string | null];

export type ValidationRuleEntry = {
  rule: string;
  errorMessage?: string;
  params?: Record<string, unknown>;
};

export type SectionFieldDef = {
  displayText: string;
  isMandatory?: boolean;
  validationRule?: string | ValidationRuleEntry[] | null;
  fieldType?: string | null;
};

export type FieldError = {
  fieldName: string;
  errors: string[];
};

export type RowValidationResult = {
  isValid: boolean;
  errorFields: FieldError[];
  skippedRules: string[];
};

export type RuleCapability =
  | "local"
  | "localCrossField"
  | "serverDb"
  | "skippedContextual"
  | "unsupported";

export const RULE_NAMES = {
  REQUIRED: "required",
  NUMERIC: "numeric",
  STRING_LENGTH: "stringLength",
  RANGE: "range",
  DATERANGE: "dateRange",
  PATTERN: "pattern",
  DATE_FORMAT: "dateFormat",
  AGE: "age",
  EMAIL: "email",
  URL: "url",
  EXIST_IN_DATABASE: "existInDatabase",
  UNIQUE_IN_DATABASE: "uniqueInDatabase",
  COMPARE_TO: "compareTo",
  FUTURE_DATE: "futureDate",
  NOT_FUTURE_DATE: "notFutureDate",
  PHONE_PATTERN: "phonePattern",
  PHONE_CODE: "phoneCode",
  DEPENDENT: "dependent",
} as const;

export const LOCAL_RULES = new Set<string>([
  RULE_NAMES.REQUIRED,
  RULE_NAMES.NUMERIC,
  RULE_NAMES.STRING_LENGTH,
  RULE_NAMES.RANGE,
  RULE_NAMES.DATERANGE,
  RULE_NAMES.PATTERN,
  RULE_NAMES.DATE_FORMAT,
  RULE_NAMES.AGE,
  RULE_NAMES.EMAIL,
  RULE_NAMES.URL,
  RULE_NAMES.FUTURE_DATE,
  RULE_NAMES.NOT_FUTURE_DATE,
  RULE_NAMES.PHONE_PATTERN,
  RULE_NAMES.PHONE_CODE,
]);

export const LOCAL_CROSS_FIELD_RULES = new Set<string>([
  RULE_NAMES.COMPARE_TO,
  RULE_NAMES.DEPENDENT,
]);

export const SERVER_DB_RULES = new Set<string>([
  RULE_NAMES.EXIST_IN_DATABASE,
  RULE_NAMES.UNIQUE_IN_DATABASE,
]);

/** Contextual / employment / bank rules — skipped client-side (not fail-closed). */
export const SKIPPED_CONTEXTUAL_RULES = new Set<string>([
  "uniqueDefaultBankAccount",
  "uniqueBankAccountNumber",
  "multiplePayroll",
  "minimumPayroll",
  "exceedingValueInNomination",
  "dependentsOfCompanySponsor",
  "workEmail",
  "functionalOrReportingManagerExist",
  "employmentType",
  "probationaryEmploymentType",
  "effectiveDate",
  "confirmedDate",
  "assessmentTenure",
  "upcomingAssessment",
  "reviewManager",
  "contractEndDate",
  "previousEmploymentNumber",
  "attendanceMode",
  "employmentNumber",
  "autoPresentEffectiveFrom",
  "dateOfJoiningVsAutoPresent",
  "languageProficiency",
  "genderByTitle",
  "maritalStatusByTitle",
  "weddingDateByMaritalStatus",
  "dbQuery",
  "duplicate",
  "cobEmploymentNumber",
  "cobExistInDatabase",
  "cobUniqueInDatabase",
  "cobExistInDatabaseCSV",
  "cobExistInDatabaseOrLinkedSection",
  "cobExistInDatabaseOrLinkedSectionCSV",
  "shiftForcedTimeout",
  "shiftOccurrenceWithinGraceRange",
]);

export function classifyRule(ruleName: string): {
  capability: RuleCapability;
  reason?: string;
} {
  if (!ruleName) {
    return { capability: "unsupported", reason: "Missing rule name." };
  }
  if (LOCAL_RULES.has(ruleName)) return { capability: "local" };
  if (LOCAL_CROSS_FIELD_RULES.has(ruleName)) {
    return { capability: "localCrossField" };
  }
  if (SERVER_DB_RULES.has(ruleName)) return { capability: "serverDb" };
  if (SKIPPED_CONTEXTUAL_RULES.has(ruleName)) {
    return { capability: "skippedContextual" };
  }
  return {
    capability: "unsupported",
    reason: `Unsupported rule '${ruleName}'.`,
  };
}
