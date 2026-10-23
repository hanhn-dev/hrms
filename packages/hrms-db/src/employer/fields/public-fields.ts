import { asFieldFlag, sqlNVarchar } from "./field-patch.ts";

export const LOCKED_PUBLIC_FIELD_NAMES = [
  "Designation",
  "BusinessUnit",
  "First Name",
  "Last Name",
] as const;

export const LOCKED_PUBLIC_FIELD_REASON =
  "This field stays public. Employee Field Configuration does not allow turning it off.";

export const NOT_PUBLIC_FIELD_REASON = "Field is not public.";

export type PublicFieldKey = {
  fieldId: number;
  employerId: number;
  sectionId: number | null;
  countryId: number | null;
  fieldName: string | null;
  fieldEntity: string | null;
  isPublic: unknown;
};

export function isLockedPublicFieldName(
  fieldName: string | null | undefined,
): boolean {
  const name = fieldName?.trim() ?? "";
  return (LOCKED_PUBLIC_FIELD_NAMES as readonly string[]).includes(name);
}

export function publicFieldClearBlockReason(input: {
  fieldName: string | null;
  isPublic: unknown;
}): string | null {
  if (!asFieldFlag(input.isPublic)) {
    return NOT_PUBLIC_FIELD_REASON;
  }
  if (isLockedPublicFieldName(input.fieldName)) {
    return LOCKED_PUBLIC_FIELD_REASON;
  }
  return null;
}

export function formatClearPublicFieldReplaySql(input: {
  env: string;
  sourceFieldId: number;
  current: PublicFieldKey;
  updatedBy: number;
}): string {
  const block = publicFieldClearBlockReason(input.current);
  if (block) {
    throw new Error(block);
  }
  const { env, sourceFieldId, current, updatedBy } = input;
  const where = [
    naturalKeyWhere(current),
    "ISNULL(Fields.IsPublic, 0) = 1",
  ].join("\n  AND ");
  return [
    "-- Replay TEmployeeDetail_Fields IsPublic clear",
    `-- Source env: ${env}  source FieldID: ${sourceFieldId} (do not use on other envs)`,
    `-- Match: EmployerId=${current.employerId} SectionID=${sqlInt(current.sectionId)} CountryID=${sqlInt(current.countryId ?? 0)} FieldName=${sqlLiteral(current.fieldName)} FieldEntity=${sqlLiteral(current.fieldEntity)}`,
    "-- UpdatedBy is this session's TROUBLESHOOTER_AUDIT_USER_ID; use a local TUsers.UserID on the target env if needed.",
    "-- FieldName in the history row stores DisplayText, matching USP_Fieldconfig_UpdateMyEmployeeDetails.",
    "",
    "SET XACT_ABORT ON;",
    "BEGIN TRAN;",
    "",
    "INSERT INTO dbo.TEmployeeDetail_FieldsConfigHistory (",
    "    FieldID, SectionID, EmployerId, CountryID, FieldName,",
    "    IsMandatory, IsHidden, IsPublic, Modified_date, ModifiedBy",
    ")",
    "SELECT",
    "    Fields.FieldID,",
    "    Fields.SectionID,",
    "    Fields.EmployerId,",
    "    Fields.CountryID,",
    "    Fields.DisplayText,",
    "    Fields.IsMandatory,",
    "    Fields.IsHidden,",
    "    Fields.IsPublic,",
    "    GETDATE(),",
    `    ${sqlInt(updatedBy)}`,
    "FROM dbo.TEmployeeDetail_Fields AS Fields",
    `WHERE ${where};`,
    "",
    "UPDATE Fields",
    "SET",
    "    Fields.IsPublic = 0,",
    `    Fields.UpdatedBy = ${sqlInt(updatedBy)},`,
    "    Fields.UpdatedDate = GETDATE()",
    "FROM dbo.TEmployeeDetail_Fields AS Fields",
    `WHERE ${where};`,
    "",
    "COMMIT TRAN;",
  ].join("\n");
}

function naturalKeyWhere(current: PublicFieldKey): string {
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

function sqlStringMatch(column: string, value: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") {
    return `(${column} IS NULL OR ${column} = N'')`;
  }
  return `${column} = ${sqlNVarchar(trimmed)}`;
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
