export function fieldColumnTitle<const T extends readonly string[]>(
  titles: T,
  title: T[number],
): T[number] {
  return title;
}

/** Column titles shared by the Employer fields and Template section tables. */
export const EMPLOYER_FIELD_TABLE_TITLES = [
  "FieldName",
  "DisplayText",
  "FieldEntity",
  "FieldType",
  "IsMandatory",
  "IsValidate",
  "ValidationRule",
  "FieldType_JSON_SQL",
  "Hidden",
  "Active",
  "Country",
  "Persist",
  "FieldID",
] as const;

/** Column titles on the Compare section tables. */
export const COMPARE_FIELD_TABLE_TITLES = [
  "Status",
  "FieldName",
  "FieldEntity",
  "Differences",
  "Type",
  "Mandatory",
  "Validate",
  "DisplayText",
  "ValidationRule",
  "FieldType_JSON_SQL",
  "Country",
] as const;
