import { Prisma } from "../../generated/prisma/client.ts";
import type { HrmsDb } from "../../shared/client.ts";
import { fieldIdSchema, parseEmployerId } from "../../shared/ids.ts";
import {
  pageQuery,
  totalCountOf,
  type PageResult,
} from "../../shared/page.ts";
import { fieldTextFilter, sectionNameFilter, sectionDisplaySql } from "./field-list-sql.ts";
import { publicFieldClearBlockReason } from "./public-fields.ts";
import {
  pageForFieldRow,
  UNSECTIONED_SECTION_NAME,
  type FieldSectionSummary,
} from "./section-page.ts";

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
  TotalCount?: number | bigint | null;
};

export async function listPublicEmployerFields(
  db: HrmsDb,
  employerId: number,
  filters: { page?: number | null; pageSize?: number | null; q?: string | null; section?: string | null } = {},
): Promise<PageResult<PublicFieldRow>> {
  const tenantId = parseEmployerId(employerId);
  const paging = pageQuery(filters.page, filters.pageSize);
  const column = Prisma.raw("Fields");
  const textFilter = fieldTextFilter(column, filters.q);
  const sectionFilter = sectionNameFilter(filters.section);
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
        Fields.IsPublic,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = Fields.SectionID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Fields.CountryID
        AND Fields.CountryID <> 0
    WHERE Fields.EmployerId = ${tenantId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
        AND ISNULL(Fields.IsPublic, 0) = 1
        ${textFilter}
        ${sectionFilter}
    ORDER BY Fields.SectionID, Fields.DisplayOrder, Fields.FieldName, Fields.FieldID
    OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY
  `;
  return {
    rows: rows.map(mapPublicFieldRow),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging.page,
    pageSize: paging.pageSize,
  };
}

export async function listPublicFieldSections(
  db: HrmsDb,
  employerId: number,
  filters: { q?: string | null; section?: string | null } = {},
): Promise<FieldSectionSummary[]> {
  const tenantId = parseEmployerId(employerId);
  const column = Prisma.raw("Fields");
  const display = sectionDisplaySql();
  const rows = await db.$queryRaw<
    Array<{ SectionID: number | null; Section: string | null; FieldCount: number | bigint | null }>
  >`
    SELECT
        Fields.SectionID AS SectionID,
        ${display} AS Section,
        COUNT(*) AS FieldCount
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = Fields.SectionID
    WHERE Fields.EmployerId = ${tenantId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
        AND ISNULL(Fields.IsPublic, 0) = 1
        ${fieldTextFilter(column, filters.q)}
        ${sectionNameFilter(filters.section)}
    GROUP BY Fields.SectionID, ${display}
    ORDER BY CASE WHEN Fields.SectionID IS NULL THEN 1 ELSE 0 END, Fields.SectionID
  `;
  return rows.map((row) => {
    const section = row.Section?.trim() ?? "";
    return {
      sectionId: row.SectionID,
      section: section === "" ? UNSECTIONED_SECTION_NAME : section,
      fieldCount: totalCountOf(row.FieldCount),
    };
  });
}

export async function publicFieldPageForFocus(
  db: HrmsDb,
  employerId: number,
  filters: { q?: string | null; section?: string | null; field?: string | null; pageSize?: number | null },
): Promise<number> {
  const field = filters.field?.trim() ?? "";
  if (field === "") {
    return pageForFieldRow(null, filters.pageSize ?? undefined);
  }
  const tenantId = parseEmployerId(employerId);
  const column = Prisma.raw("Fields");
  const rows = await db.$queryRaw<Array<{ RowNumber: number | bigint | null }>>`
    WITH Ranked AS (
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY Fields.SectionID, Fields.DisplayOrder, Fields.FieldName, Fields.FieldID
            ) AS RowNumber,
            Fields.FieldName AS FieldName
        FROM dbo.TEmployeeDetail_Fields AS Fields
        LEFT JOIN dbo.TEmployeeDetail_Section AS Section
            ON Section.SectionID = Fields.SectionID
        WHERE Fields.EmployerId = ${tenantId}
            AND ISNULL(Fields.IsDeleted, 0) = 0
            AND ISNULL(Fields.IsPublic, 0) = 1
            ${fieldTextFilter(column, filters.q)}
            ${sectionNameFilter(filters.section)}
    )
    SELECT TOP (1) Ranked.RowNumber
    FROM Ranked
    WHERE LOWER(LTRIM(RTRIM(ISNULL(Ranked.FieldName, N'')))) = LOWER(${field})
  `;
  const rowNumber = rows[0]?.RowNumber;
  if (rowNumber == null) {
    return pageForFieldRow(null, filters.pageSize ?? undefined);
  }
  const value = Number(rowNumber);
  return pageForFieldRow(Number.isInteger(value) ? value : null, filters.pageSize ?? undefined);
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
