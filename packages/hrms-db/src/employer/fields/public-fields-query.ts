import type { HrmsDb } from "../../shared/client.ts";
import { fieldIdSchema, parseEmployerId } from "../../shared/ids.ts";
import { publicFieldClearBlockReason } from "./public-fields.ts";

export type PublicFieldRow = {
  fieldId: number;
  sectionId: number | null;
  section: string | null;
  employerId: number;
  countryId: number | null;
  countryName: string | null;
  fieldName: string | null;
  displayText: string | null;
  displayOrder: number | null;
  fieldEntity: string | null;
  isHidden: boolean | number | null;
  isPublic: boolean | number | null;
};

type PublicFieldQueryRow = {
  FieldID: number;
  SectionID: number | null;
  Section: string | null;
  EmployerId: number;
  CountryID: number | null;
  CountryName: string | null;
  FieldName: string | null;
  DisplayText: string | null;
  DisplayOrder: number | null;
  FieldEntity: string | null;
  IsHidden: boolean | number | null;
  IsPublic: boolean | number | null;
};

export async function listPublicEmployerFields(
  db: HrmsDb,
  employerId: number,
): Promise<PublicFieldRow[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<PublicFieldQueryRow[]>`
    SELECT
        Fields.FieldID,
        Fields.SectionID,
        Section.Section,
        Fields.EmployerId,
        Fields.CountryID,
        Country.NICENAME AS CountryName,
        Fields.FieldName,
        Fields.DisplayText,
        Fields.DisplayOrder,
        Fields.FieldEntity,
        Fields.IsHidden,
        Fields.IsPublic
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = Fields.SectionID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Fields.CountryID
        AND Fields.CountryID <> 0
    WHERE Fields.EmployerId = ${tenantId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
        AND ISNULL(Fields.IsPublic, 0) = 1
    ORDER BY Fields.SectionID, Fields.DisplayOrder, Fields.FieldName, Fields.FieldID
  `;
  return rows.map(mapPublicFieldRow);
}

export async function getPublicEmployerField(
  db: HrmsDb,
  input: { employerId: number; fieldId: number },
): Promise<PublicFieldRow | null> {
  const employerId = parseEmployerId(input.employerId);
  const fieldId = fieldIdSchema.parse(input.fieldId);
  const rows = await db.$queryRaw<PublicFieldQueryRow[]>`
    SELECT
        Fields.FieldID,
        Fields.SectionID,
        Section.Section,
        Fields.EmployerId,
        Fields.CountryID,
        Country.NICENAME AS CountryName,
        Fields.FieldName,
        Fields.DisplayText,
        Fields.DisplayOrder,
        Fields.FieldEntity,
        Fields.IsHidden,
        Fields.IsPublic
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = Fields.SectionID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Fields.CountryID
        AND Fields.CountryID <> 0
    WHERE Fields.FieldID = ${fieldId}
        AND Fields.EmployerId = ${employerId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
  `;
  const row = rows[0];
  return row ? mapPublicFieldRow(row) : null;
}

export async function clearEmployerFieldPublic(
  db: HrmsDb,
  input: { employerId: number; fieldId: number; updatedBy: number },
): Promise<void> {
  const employerId = parseEmployerId(input.employerId);
  const fieldId = fieldIdSchema.parse(input.fieldId);
  const updatedBy = input.updatedBy;

  await db.$transaction(async (tx) => {
    const current = await getPublicEmployerField(tx as HrmsDb, {
      employerId,
      fieldId,
    });
    if (!current) {
      throw new Error("Field was not found for this employer.");
    }
    const block = publicFieldClearBlockReason(current);
    if (block) {
      throw new Error(block);
    }

    const inserted = await tx.$executeRaw`
      INSERT INTO dbo.TEmployeeDetail_FieldsConfigHistory (
          FieldID, SectionID, EmployerId, CountryID, FieldName,
          IsMandatory, IsHidden, IsPublic, Modified_date, ModifiedBy
      )
      SELECT
          Fields.FieldID,
          Fields.SectionID,
          Fields.EmployerId,
          Fields.CountryID,
          Fields.DisplayText,
          Fields.IsMandatory,
          Fields.IsHidden,
          Fields.IsPublic,
          GETDATE(),
          ${updatedBy}
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.FieldID = ${fieldId}
          AND Fields.EmployerId = ${employerId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
          AND ISNULL(Fields.IsPublic, 0) = 1
    `;
    if (inserted !== 1) {
      throw new Error("Field is not public.");
    }

    const updated = await tx.$executeRaw`
      UPDATE Fields
      SET
          Fields.IsPublic = 0,
          Fields.UpdatedBy = ${updatedBy},
          Fields.UpdatedDate = GETDATE()
      FROM dbo.TEmployeeDetail_Fields AS Fields
      WHERE Fields.FieldID = ${fieldId}
          AND Fields.EmployerId = ${employerId}
          AND ISNULL(Fields.IsDeleted, 0) = 0
          AND ISNULL(Fields.IsPublic, 0) = 1
    `;
    if (updated !== 1) {
      throw new Error("Field is not public.");
    }
  });
}

function mapPublicFieldRow(row: PublicFieldQueryRow): PublicFieldRow {
  return {
    fieldId: row.FieldID,
    sectionId: row.SectionID,
    section: row.Section,
    employerId: row.EmployerId,
    countryId: row.CountryID,
    countryName: row.CountryName,
    fieldName: row.FieldName,
    displayText: row.DisplayText,
    displayOrder: row.DisplayOrder == null ? null : Number(row.DisplayOrder),
    fieldEntity: row.FieldEntity,
    isHidden: row.IsHidden,
    isPublic: row.IsPublic,
  };
}
