import { z } from "zod";

export const KNOWN_FIELD_ENTITIES = [
  "System",
  "Country",
  "Custom",
  "Segment",
  "BulkCreation",
] as const;

export const fieldRowPatchSchema = z.object({
  fieldName: z.string().trim().min(1).max(255),
  displayText: z.string().trim().min(1).max(255),
  fieldEntity: z.string().trim().min(1).max(50),
  fieldTypeId: z.number().int().positive(),
  isMandatory: z.boolean(),
  isValidate: z.boolean(),
  isHidden: z.boolean(),
  isActive: z.boolean(),
});

export type FieldRowPatch = z.infer<typeof fieldRowPatchSchema>;

export type FieldRowCurrent = {
  fieldId: number;
  employerId: number;
  sectionId: number | null;
  countryId: number | null;
  fieldName: string | null;
  displayText: string | null;
  fieldEntity: string | null;
  fieldTypeId: number | null;
  fieldType: string | null;
  isMandatory: boolean | number | null;
  isValidate: boolean | number | null;
  isHidden: boolean | number | null;
  isActive: boolean | number | null;
  isDefault: boolean | number | null;
  validationRule: string | null;
};

export type FieldPropertyDiff = {
  Property: string;
  Current: string;
  Proposed: string;
};

export function parseFieldRowPatch(input: unknown): FieldRowPatch {
  return fieldRowPatchSchema.parse(input);
}

export function asFieldFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}

export function diffFieldRow(
  current: FieldRowCurrent,
  patch: FieldRowPatch,
  proposedFieldType: string | null,
): FieldPropertyDiff[] {
  const diffs: Array<{
    property: string;
    current: string;
    proposed: string;
    changed: boolean;
  }> = [
    compareText("FieldName", current.fieldName, patch.fieldName),
    compareText("DisplayText", current.displayText, patch.displayText),
    compareText("FieldEntity", current.fieldEntity, patch.fieldEntity),
    {
      property: "FieldType",
      current: current.fieldType?.trim() || "—",
      proposed: proposedFieldType?.trim() || String(patch.fieldTypeId),
      changed: (current.fieldTypeId ?? null) !== patch.fieldTypeId,
    },
    compareFlag("IsMandatory", current.isMandatory, patch.isMandatory),
    compareFlag("IsValidate", current.isValidate, patch.isValidate),
    compareFlag("Hidden", current.isHidden, patch.isHidden),
    compareFlag("Active", current.isActive, patch.isActive),
  ];
  return diffs
    .filter((row) => row.changed)
    .map((row) => ({
      Property: row.property,
      Current: row.current,
      Proposed: row.proposed,
    }));
}

export function formatFieldRowReplaySql(input: {
  env: string;
  sourceFieldId: number;
  current: FieldRowCurrent;
  patch: FieldRowPatch;
  updatedBy: number;
}): string {
  const { env, sourceFieldId, current, patch, updatedBy } = input;
  const sets = changedSetClauses(current, patch);
  sets.push(`Fields.UpdatedBy = ${sqlInt(updatedBy)}`);
  sets.push("Fields.UpdatedDate = GETDATE()");
  const where = naturalKeyWhere(current);
  return [
    "-- Replay TEmployeeDetail_Fields update",
    `-- Source env: ${env}  source FieldID: ${sourceFieldId} (do not use on other envs)`,
    `-- Match: EmployerId=${current.employerId} SectionID=${sqlInt(current.sectionId)} CountryID=${sqlInt(current.countryId ?? 0)} FieldName=${sqlLiteral(current.fieldName)} FieldEntity=${sqlLiteral(current.fieldEntity)}`,
    "-- UpdatedBy is this session's TROUBLESHOOTER_AUDIT_USER_ID; use a local TUsers.UserID on the target env if needed.",
    "",
    "SET XACT_ABORT ON;",
    "BEGIN TRAN;",
    "",
    "INSERT INTO dbo.TEmployeeDetail_Fields_UpdateHistory (",
    "    FieldID, SectionID, EmployerId, CountryID, FieldName, DisplayText,",
    "    IsValidate, ValidationRule, Modified_date, ModifiedBy, Action, FieldEntity, FieldTypeId",
    ")",
    "SELECT",
    "    Fields.FieldID,",
    "    Fields.SectionID,",
    "    Fields.EmployerId,",
    "    Fields.CountryID,",
    "    Fields.FieldName,",
    "    Fields.DisplayText,",
    "    Fields.IsValidate,",
    "    Fields.ValidationRule,",
    "    GETDATE(),",
    `    ${sqlInt(updatedBy)},`,
    "    N'Update',",
    "    Fields.FieldEntity,",
    "    Fields.FieldTypeID",
    "FROM dbo.TEmployeeDetail_Fields AS Fields",
    `WHERE ${where};`,
    "",
    "UPDATE Fields",
    "SET",
    `    ${sets.join(",\n    ")}`,
    "FROM dbo.TEmployeeDetail_Fields AS Fields",
    `WHERE ${where};`,
    "",
    "COMMIT TRAN;",
  ].join("\n");
}

export function formatValidationRuleReplaySql(input: {
  env: string;
  sourceFieldId: number;
  current: FieldRowCurrent;
  validationRule: string | null;
  updatedBy: number;
}): string {
  const { env, sourceFieldId, current, validationRule, updatedBy } = input;
  const where = naturalKeyWhere(current);
  return [
    "-- Replay TEmployeeDetail_Fields ValidationRule update",
    `-- Source env: ${env}  source FieldID: ${sourceFieldId} (do not use on other envs)`,
    `-- Match: EmployerId=${current.employerId} SectionID=${sqlInt(current.sectionId)} CountryID=${sqlInt(current.countryId ?? 0)} FieldName=${sqlLiteral(current.fieldName)} FieldEntity=${sqlLiteral(current.fieldEntity)}`,
    "-- UpdatedBy is this session's TROUBLESHOOTER_AUDIT_USER_ID; use a local TUsers.UserID on the target env if needed.",
    "",
    "SET XACT_ABORT ON;",
    "BEGIN TRAN;",
    "",
    "INSERT INTO dbo.TEmployeeDetail_Fields_UpdateHistory (",
    "    FieldID, SectionID, EmployerId, CountryID, FieldName, DisplayText,",
    "    IsValidate, ValidationRule, Modified_date, ModifiedBy",
    ")",
    "SELECT",
    "    Fields.FieldID,",
    "    Fields.SectionID,",
    "    Fields.EmployerId,",
    "    Fields.CountryID,",
    "    Fields.FieldName,",
    "    Fields.DisplayText,",
    "    Fields.IsValidate,",
    "    Fields.ValidationRule,",
    "    GETDATE(),",
    `    ${sqlInt(updatedBy)}`,
    "FROM dbo.TEmployeeDetail_Fields AS Fields",
    `WHERE ${where};`,
    "",
    "UPDATE Fields",
    "SET",
    `    Fields.ValidationRule = ${sqlNVarchar(validationRule)},`,
    `    Fields.UpdatedBy = ${sqlInt(updatedBy)},`,
    "    Fields.UpdatedDate = GETDATE()",
    "FROM dbo.TEmployeeDetail_Fields AS Fields",
    `WHERE ${where};`,
    "",
    "COMMIT TRAN;",
  ].join("\n");
}

function changedSetClauses(
  current: FieldRowCurrent,
  patch: FieldRowPatch,
): string[] {
  const sets: string[] = [];
  if (normalizeText(current.fieldName) !== patch.fieldName) {
    sets.push(`Fields.FieldName = ${sqlNVarchar(patch.fieldName)}`);
  }
  if (normalizeText(current.displayText) !== patch.displayText) {
    sets.push(`Fields.DisplayText = ${sqlNVarchar(patch.displayText)}`);
  }
  if (normalizeText(current.fieldEntity) !== patch.fieldEntity) {
    sets.push(`Fields.FieldEntity = ${sqlNVarchar(patch.fieldEntity)}`);
  }
  if ((current.fieldTypeId ?? null) !== patch.fieldTypeId) {
    sets.push(`Fields.FieldTypeID = ${sqlInt(patch.fieldTypeId)}`);
  }
  if (asFieldFlag(current.isMandatory) !== patch.isMandatory) {
    sets.push(`Fields.IsMandatory = ${sqlBit(patch.isMandatory)}`);
  }
  if (asFieldFlag(current.isValidate) !== patch.isValidate) {
    sets.push(`Fields.IsValidate = ${sqlBit(patch.isValidate)}`);
  }
  if (asFieldFlag(current.isHidden) !== patch.isHidden) {
    sets.push(`Fields.IsHidden = ${sqlBit(patch.isHidden)}`);
  }
  if (asFieldFlag(current.isActive) !== patch.isActive) {
    sets.push(`Fields.IsActive = ${sqlBit(patch.isActive)}`);
  }
  return sets;
}

function naturalKeyWhere(current: FieldRowCurrent): string {
  const section =
    current.sectionId == null
      ? "Fields.SectionID IS NULL"
      : `Fields.SectionID = ${sqlInt(current.sectionId)}`;
  return [
    `Fields.EmployerId = ${sqlInt(current.employerId)}`,
    section,
    `ISNULL(Fields.CountryID, 0) = ${sqlInt(current.countryId ?? 0)}`,
    sqlStringMatch("Fields.FieldName", current.fieldName),
    sqlStringMatch("Fields.FieldEntity", current.fieldEntity),
    "ISNULL(Fields.IsDeleted, 0) = 0",
  ].join("\n  AND ");
}

function compareText(
  property: string,
  current: string | null,
  proposed: string,
): {
  property: string;
  current: string;
  proposed: string;
  changed: boolean;
} {
  const currentText = normalizeText(current);
  return {
    property,
    current: currentText || "—",
    proposed,
    changed: currentText !== proposed,
  };
}

function compareFlag(
  property: string,
  current: unknown,
  proposed: boolean,
): {
  property: string;
  current: string;
  proposed: string;
  changed: boolean;
} {
  const currentFlag = asFieldFlag(current);
  return {
    property,
    current: currentFlag ? "Yes" : "No",
    proposed: proposed ? "Yes" : "No",
    changed: currentFlag !== proposed,
  };
}

function sqlStringMatch(column: string, value: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return `(${column} IS NULL OR ${column} = N'')`;
  }
  return `${column} = ${sqlNVarchar(trimmed)}`;
}

export function sqlNVarchar(value: string | null): string {
  if (value == null) {
    return "NULL";
  }
  return `N'${value.replaceAll("'", "''")}'`;
}

function sqlLiteral(value: string | null): string {
  if (value == null || value.trim() === "") {
    return "NULL";
  }
  return sqlNVarchar(value.trim());
}

function sqlInt(value: number | null): string {
  return value == null ? "NULL" : String(value);
}

function sqlBit(value: boolean): string {
  return value ? "1" : "0";
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}
