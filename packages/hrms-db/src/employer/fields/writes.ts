import type { HrmsDb } from "../../shared/client";
import { fieldIdSchema, parseEmployerId } from "../../shared/ids";
import {
  asFieldFlag,
  type FieldRowCurrent,
  parseFieldRowPatch,
} from "./field-patch";
import { parseValidationRuleJson } from "./validation-rule";

type FieldRowQuery = {
  FieldID: number;
  SectionID: number | null;
  EmployerId: number;
  CountryID: number | null;
  FieldName: string | null;
  DisplayText: string | null;
  FieldEntity: string | null;
  FieldTypeID: number | null;
  FieldType: string | null;
  IsMandatory: boolean | number | null;
  IsValidate: boolean | number | null;
  IsHidden: boolean | number | null;
  IsActive: boolean | number | null;
  IsDefault: boolean | number | null;
  ValidationRule: string | null;
};

export async function getEmployerFieldRow(
  db: HrmsDb,
  input: { employerId: number; fieldId: number },
): Promise<FieldRowCurrent | null> {
  const employerId = parseEmployerId(input.employerId);
  const fieldId = fieldIdSchema.parse(input.fieldId);
  const rows = await db.$queryRaw<FieldRowQuery[]>`
    SELECT
        Fields.FieldID,
        Fields.SectionID,
        Fields.EmployerId,
        Fields.CountryID,
        Fields.FieldName,
        Fields.DisplayText,
        Fields.FieldEntity,
        Fields.FieldTypeID,
        FieldType.FieldType,
        Fields.IsMandatory,
        Fields.IsValidate,
        Fields.IsHidden,
        Fields.IsActive,
        Fields.IsDefault,
        Fields.ValidationRule
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TFieldType_LookUp AS FieldType
        ON FieldType.FieldTypeID = Fields.FieldTypeID
    WHERE Fields.FieldID = ${fieldId}
        AND Fields.EmployerId = ${employerId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
  `;
  const row = rows[0];
  return row ? mapFieldRowCurrent(row) : null;
}

export async function getEmployerFieldValidationPreview(
  db: HrmsDb,
  input: { employerId: number; fieldId: number },
): Promise<Array<Record<string, unknown>>> {
  const row = await getEmployerFieldRow(db, input);
  if (!row) {
    return [];
  }
  return [
    {
      FieldID: row.fieldId,
      FieldName: row.fieldName,
      ValidationRule: row.validationRule,
    },
  ];
}

export async function getFieldTypeName(
  db: HrmsDb,
  fieldTypeId: number,
): Promise<string | null> {
  const rows = await db.$queryRaw<Array<{ FieldType: string | null }>>`
    SELECT FieldType.FieldType
    FROM dbo.TFieldType_LookUp AS FieldType
    WHERE FieldType.FieldTypeID = ${fieldTypeId}
  `;
  return rows[0]?.FieldType ?? null;
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
    const existing = await getEmployerFieldRow(tx as HrmsDb, {
      employerId,
      fieldId,
    });
    if (!existing) {
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

export async function updateEmployerFieldRow(
  db: HrmsDb,
  input: {
    employerId: number;
    fieldId: number;
    patch: unknown;
    updatedBy: number;
  },
): Promise<void> {
  const employerId = parseEmployerId(input.employerId);
  const fieldId = fieldIdSchema.parse(input.fieldId);
  const patch = parseFieldRowPatch(input.patch);
  const updatedBy = input.updatedBy;
  const isMandatory = patch.isMandatory ? 1 : 0;
  const isValidate = patch.isValidate ? 1 : 0;
  const isHidden = patch.isHidden ? 1 : 0;
  const isActive = patch.isActive ? 1 : 0;

  await db.$transaction(async (tx) => {
    const existing = await getEmployerFieldRow(tx as HrmsDb, {
      employerId,
      fieldId,
    });
    if (!existing) {
      throw new Error("Field was not found for this employer.");
    }
    if (asFieldFlag(existing.isDefault) && !patch.isMandatory) {
      throw new Error(
        "IsMandatory cannot be turned off for a System Mandatory field.",
      );
    }

    const typeName = await getFieldTypeName(tx as HrmsDb, patch.fieldTypeId);
    if (typeName == null) {
      throw new Error("FieldType was not found.");
    }

    const duplicates = await tx.$queryRaw<Array<{ FieldID: number }>>`
      SELECT Fields.FieldID
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.EmployerId = ${employerId}
          AND Fields.FieldID <> ${fieldId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
          AND (
              (${existing.sectionId} IS NULL AND Fields.SectionID IS NULL)
              OR Fields.SectionID = ${existing.sectionId}
          )
          AND ISNULL(Fields.CountryID, 0) = ${existing.countryId ?? 0}
          AND LOWER(LTRIM(RTRIM(ISNULL(Fields.FieldName, N'')))) = LOWER(${patch.fieldName})
          AND LOWER(LTRIM(RTRIM(ISNULL(Fields.FieldEntity, N'')))) = LOWER(${patch.fieldEntity})
    `;
    if (duplicates.length > 0) {
      throw new Error(
        "Another field already uses this FieldName and FieldEntity in the same section and country.",
      );
    }

    await tx.$executeRaw`
      INSERT INTO dbo.TEmployeeDetail_Fields_UpdateHistory (
          FieldID, SectionID, EmployerId, CountryID, FieldName, DisplayText,
          IsValidate, ValidationRule, Modified_date, ModifiedBy, Action, FieldEntity, FieldTypeId
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
          ${updatedBy},
          N'Update',
          Fields.FieldEntity,
          Fields.FieldTypeID
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.FieldID = ${fieldId}
          AND Fields.EmployerId = ${employerId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
    `;

    await tx.$executeRaw`
      UPDATE Fields
      SET
          Fields.FieldName = ${patch.fieldName},
          Fields.DisplayText = ${patch.displayText},
          Fields.FieldEntity = ${patch.fieldEntity},
          Fields.FieldTypeID = ${patch.fieldTypeId},
          Fields.IsMandatory = ${isMandatory},
          Fields.IsValidate = ${isValidate},
          Fields.IsHidden = ${isHidden},
          Fields.IsActive = ${isActive},
          Fields.UpdatedBy = ${updatedBy},
          Fields.UpdatedDate = GETDATE()
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.FieldID = ${fieldId}
          AND Fields.EmployerId = ${employerId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
    `;
  });
}

function mapFieldRowCurrent(row: FieldRowQuery): FieldRowCurrent {
  return {
    fieldId: row.FieldID,
    employerId: row.EmployerId,
    sectionId: row.SectionID,
    countryId: row.CountryID,
    fieldName: row.FieldName,
    displayText: row.DisplayText,
    fieldEntity: row.FieldEntity,
    fieldTypeId: row.FieldTypeID,
    fieldType: row.FieldType,
    isMandatory: row.IsMandatory,
    isValidate: row.IsValidate,
    isHidden: row.IsHidden,
    isActive: row.IsActive,
    isDefault: row.IsDefault,
    validationRule: row.ValidationRule,
  };
}
