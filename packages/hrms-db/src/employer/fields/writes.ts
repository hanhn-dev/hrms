import type { HrmsDb } from "../../shared/client";
import { fieldIdSchema, parseEmployerId } from "../../shared/ids";
import { parseValidationRuleJson } from "./validation-rule";

type FieldValidationPreviewRow = {
  FieldID: number;
  FieldName: string | null;
  ValidationRule: string | null;
};

export async function getEmployerFieldValidationPreview(
  db: HrmsDb,
  input: { employerId: number; fieldId: number },
): Promise<Array<Record<string, unknown>>> {
  const employerId = parseEmployerId(input.employerId);
  const fieldId = fieldIdSchema.parse(input.fieldId);
  const rows = await db.$queryRaw<FieldValidationPreviewRow[]>`
    SELECT
        Fields.FieldID,
        Fields.FieldName,
        Fields.ValidationRule
    FROM dbo.TEmployeeDetail_Fields AS Fields
    WHERE Fields.FieldID = ${fieldId}
        AND Fields.EmployerId = ${employerId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
  `;
  return rows;
}

export async function updateEmployerFieldValidationRule(
  db: HrmsDb,
  input: {
    employerId: number;
    fieldId: number;
    validationRule: string | null;
    updatedBy: number;
  },
): Promise<void> {
  const employerId = parseEmployerId(input.employerId);
  const fieldId = fieldIdSchema.parse(input.fieldId);
  const parsed = parseValidationRuleJson(input.validationRule);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const updatedBy = input.updatedBy;

  await db.$transaction(async (tx) => {
    const existing = await tx.$queryRaw<Array<{ FieldID: number }>>`
      SELECT Fields.FieldID
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.FieldID = ${fieldId}
          AND Fields.EmployerId = ${employerId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
    `;
    if (existing.length === 0) {
      throw new Error("Field was not found for this employer.");
    }

    await tx.$executeRaw`
      INSERT INTO dbo.TEmployeeDetail_Fields_UpdateHistory (
          FieldID, SectionID, EmployerId, CountryID, FieldName, DisplayText,
          IsValidate, ValidationRule, Modified_date, ModifiedBy
      )
      SELECT
          Fields.FieldID,
          Fields.SectionID,
          Fields.EmployerId,
          Fields.CountryID,
          Fields.FieldName,
          Fields.DisplayText,
          Fields.IsValidate,
          Fields.ValidationRule,
          GETDATE(),
          ${updatedBy}
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.FieldID = ${fieldId}
          AND Fields.EmployerId = ${employerId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
    `;

    await tx.$executeRaw`
      UPDATE Fields
      SET
          Fields.ValidationRule = ${parsed.compact},
          Fields.UpdatedBy = ${updatedBy},
          Fields.UpdatedDate = GETDATE()
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.FieldID = ${fieldId}
          AND Fields.EmployerId = ${employerId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
    `;
  });
}
