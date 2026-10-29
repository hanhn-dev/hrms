import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import {
  pageQuery,
  searchText,
  totalCountOf,
  type PageResult,
} from "../../shared/page.ts";
import type { FieldCatalogRow } from "./fields-compare";
import { fieldEntityFilter, fieldTextFilter, sectionDisplaySql, sectionNameFilter } from "./field-list-sql.ts";
import { pageForFieldRow, UNSECTIONED_SECTION_NAME, type FieldSectionSummary } from "./section-page.ts";

export {
  compareEmployerFieldsToTemplate,
  type FieldCatalogRow,
  type FieldCompareRow,
  type FieldCompareStatus,
} from "./fields-compare";

const TEMPLATE_EMPLOYER_ID = 0;

type FieldQueryRow = {
  FieldID: number;
  SectionID: number | null;
  Section: string | null;
  EmployerId: number | null;
  CountryID: number | null;
  CountryName: string | null;
  FieldName: string | null;
  DisplayText: string | null;
  DisplayOrder: number | null;
  FieldEntity: string | null;
  FieldTypeID: number | null;
  FieldType: string | null;
  IsMandatory: boolean | number | null;
  IsValidate: boolean | number | null;
  ValidationRule: string | null;
  FieldType_JSON_SQL: string | null;
  IsHidden: boolean | number | null;
  IsActive: boolean | number | null;
  IsDefault: boolean | number | null;
  DB_Table: string | null;
  DB_Column: string | null;
  TotalCount?: number | bigint | null;
};

export type FieldListFilters = {
  page?: number | null;
  q?: string | null;
  section?: string | null;
  /** Omit to skip the entity predicate. An empty list matches no rows. */
  entities?: readonly string[] | null;
};

export type { FieldSectionSummary } from "./section-page.ts";

export async function listEmployerFields(
  db: HrmsDb,
  employerId: number,
  filters: FieldListFilters = {},
): Promise<PageResult<FieldCatalogRow>> {
  const tenantId = parseEmployerId(employerId);
  return queryFieldPage(db, "Fields", "dbo.TEmployeeDetail_Fields", tenantId, filters, true);
}

/** Compare needs every row in the chosen section or search, not one page of each side. */
export async function listEmployerFieldsForCompare(
  db: HrmsDb,
  employerId: number,
  filters: Pick<FieldListFilters, "q" | "section">,
): Promise<FieldCatalogRow[]> {
  if (!compareIsBounded(filters)) {
    return [];
  }
  const tenantId = parseEmployerId(employerId);
  const page = await queryFieldPage(
    db,
    "Fields",
    "dbo.TEmployeeDetail_Fields",
    tenantId,
    filters,
    false,
  );
  return page.rows;
}

export async function listFieldTemplate(
  db: HrmsDb,
  filters: FieldListFilters = {},
): Promise<PageResult<FieldCatalogRow>> {
  return queryFieldPage(
    db,
    "Master",
    "dbo.TEmployeeDetail_Fields_Master",
    TEMPLATE_EMPLOYER_ID,
    filters,
    true,
  );
}

export async function listFieldTemplateForCompare(
  db: HrmsDb,
  filters: Pick<FieldListFilters, "q" | "section">,
): Promise<FieldCatalogRow[]> {
  if (!compareIsBounded(filters)) {
    return [];
  }
  const page = await queryFieldPage(
    db,
    "Master",
    "dbo.TEmployeeDetail_Fields_Master",
    TEMPLATE_EMPLOYER_ID,
    filters,
    false,
  );
  return page.rows;
}

function compareIsBounded(filters: Pick<FieldListFilters, "q" | "section">): boolean {
  return searchText(filters.q) != null || (filters.section?.trim() ?? "") !== "";
}

export async function listEmployerFieldSections(
  db: HrmsDb,
  employerId: number,
  filters: FieldListFilters = {},
): Promise<FieldSectionSummary[]> {
  const tenantId = parseEmployerId(employerId);
  return queryFieldSections(db, "Fields", "dbo.TEmployeeDetail_Fields", tenantId, filters);
}

export async function listFieldTemplateSections(
  db: HrmsDb,
  filters: FieldListFilters = {},
): Promise<FieldSectionSummary[]> {
  return queryFieldSections(
    db,
    "Master",
    "dbo.TEmployeeDetail_Fields_Master",
    TEMPLATE_EMPLOYER_ID,
    filters,
  );
}

export async function findEmployerFieldRowNumber(
  db: HrmsDb,
  employerId: number,
  filters: FieldListFilters & { field: string },
): Promise<number | null> {
  const tenantId = parseEmployerId(employerId);
  return queryFieldRowNumber(
    db,
    "Fields",
    "dbo.TEmployeeDetail_Fields",
    tenantId,
    filters,
    filters.field,
  );
}

export async function findTemplateFieldRowNumber(
  db: HrmsDb,
  filters: FieldListFilters & { field: string },
): Promise<number | null> {
  return queryFieldRowNumber(
    db,
    "Master",
    "dbo.TEmployeeDetail_Fields_Master",
    TEMPLATE_EMPLOYER_ID,
    filters,
    filters.field,
  );
}

export async function employerFieldPageForFocus(
  db: HrmsDb,
  employerId: number,
  filters: FieldListFilters & { field?: string | null },
): Promise<number> {
  const field = filters.field?.trim() ?? "";
  if (field === "") {
    return pageForFieldRow(null);
  }
  const rowNumber = await findEmployerFieldRowNumber(db, employerId, { ...filters, field });
  return pageForFieldRow(rowNumber);
}

export async function templateFieldPageForFocus(
  db: HrmsDb,
  filters: FieldListFilters & { field?: string | null },
): Promise<number> {
  const field = filters.field?.trim() ?? "";
  if (field === "") {
    return pageForFieldRow(null);
  }
  const rowNumber = await findTemplateFieldRowNumber(db, { ...filters, field });
  return pageForFieldRow(rowNumber);
}

async function queryFieldPage(
  db: HrmsDb,
  alias: "Fields" | "Master",
  tableName: "dbo.TEmployeeDetail_Fields" | "dbo.TEmployeeDetail_Fields_Master",
  employerId: number,
  filters: FieldListFilters,
  paged: boolean,
): Promise<PageResult<FieldCatalogRow>> {
  const paging = pageQuery(filters.page);
  const column = Prisma.raw(alias);
  const table = Prisma.raw(tableName);
  const textFilter = fieldTextFilter(column, filters.q);
  const sectionFilter = sectionNameFilter(filters.section);
  const entityFilter = fieldEntityFilter(column, filters.entities);
  const window = paged
    ? Prisma.sql`OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY`
    : Prisma.empty;
  const rows = await db.$queryRaw<FieldQueryRow[]>`
    SELECT
        ${column}.FieldID,
        ${column}.SectionID,
        Section.Section,
        ${column}.EmployerId,
        ${column}.CountryID,
        Country.NICENAME AS CountryName,
        ${column}.FieldName,
        ${column}.DisplayText,
        ${column}.DisplayOrder,
        ${column}.FieldEntity,
        ${column}.FieldTypeID,
        FieldType.FieldType,
        ${column}.IsMandatory,
        ${column}.IsValidate,
        ${column}.ValidationRule,
        ${column}.FieldType_JSON_SQL,
        ${column}.IsHidden,
        ${column}.IsActive,
        ${column}.IsDefault,
        ${column}.DB_Table,
        ${column}.DB_Column,
        COUNT(*) OVER() AS TotalCount
    FROM ${table} AS ${column}
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = ${column}.SectionID
    LEFT JOIN dbo.TFieldType_LookUp AS FieldType
        ON FieldType.FieldTypeID = ${column}.FieldTypeID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = ${column}.CountryID
        AND ${column}.CountryID <> 0
    WHERE ${column}.EmployerId = ${employerId}
        AND ISNULL(${column}.IsDeleted, 0) = 0
        ${textFilter}
        ${sectionFilter}
        ${entityFilter}
    ORDER BY ${column}.SectionID, ${column}.DisplayOrder, ${column}.FieldName, ${column}.FieldID
    ${window}
  `;
  return {
    rows: rows.map(mapFieldRow),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paged ? paging.page : 1,
    pageSize: paged ? paging.pageSize : rows.length,
  };
}

async function queryFieldSections(
  db: HrmsDb,
  alias: "Fields" | "Master",
  tableName: "dbo.TEmployeeDetail_Fields" | "dbo.TEmployeeDetail_Fields_Master",
  employerId: number,
  filters: FieldListFilters,
): Promise<FieldSectionSummary[]> {
  const column = Prisma.raw(alias);
  const table = Prisma.raw(tableName);
  const display = sectionDisplaySql();
  const rows = await db.$queryRaw<
    Array<{ SectionID: number | null; Section: string | null; FieldCount: number | bigint | null }>
  >`
    SELECT
        ${column}.SectionID AS SectionID,
        ${display} AS Section,
        COUNT(*) AS FieldCount
    FROM ${table} AS ${column}
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = ${column}.SectionID
    WHERE ${column}.EmployerId = ${employerId}
        AND ISNULL(${column}.IsDeleted, 0) = 0
        ${fieldTextFilter(column, filters.q)}
        ${sectionNameFilter(filters.section)}
        ${fieldEntityFilter(column, filters.entities)}
    GROUP BY ${column}.SectionID, ${display}
    ORDER BY CASE WHEN ${column}.SectionID IS NULL THEN 1 ELSE 0 END, ${column}.SectionID
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

async function queryFieldRowNumber(
  db: HrmsDb,
  alias: "Fields" | "Master",
  tableName: "dbo.TEmployeeDetail_Fields" | "dbo.TEmployeeDetail_Fields_Master",
  employerId: number,
  filters: FieldListFilters,
  fieldName: string,
): Promise<number | null> {
  const name = fieldName.trim();
  if (name === "") {
    return null;
  }
  const column = Prisma.raw(alias);
  const table = Prisma.raw(tableName);
  const rows = await db.$queryRaw<Array<{ RowNumber: number | bigint | null }>>`
    WITH Ranked AS (
        SELECT
            ROW_NUMBER() OVER (
                ORDER BY ${column}.SectionID, ${column}.DisplayOrder, ${column}.FieldName, ${column}.FieldID
            ) AS RowNumber,
            ${column}.FieldName AS FieldName
        FROM ${table} AS ${column}
        LEFT JOIN dbo.TEmployeeDetail_Section AS Section
            ON Section.SectionID = ${column}.SectionID
        WHERE ${column}.EmployerId = ${employerId}
            AND ISNULL(${column}.IsDeleted, 0) = 0
            ${fieldTextFilter(column, filters.q)}
            ${sectionNameFilter(filters.section)}
            ${fieldEntityFilter(column, filters.entities)}
    )
    SELECT TOP (1) Ranked.RowNumber
    FROM Ranked
    WHERE LOWER(LTRIM(RTRIM(ISNULL(Ranked.FieldName, N'')))) = LOWER(${name})
  `;
  const rowNumber = rows[0]?.RowNumber;
  if (rowNumber == null) {
    return null;
  }
  const value = Number(rowNumber);
  return Number.isInteger(value) ? value : null;
}

export type FieldTypeOption = {
  fieldTypeId: number;
  fieldType: string;
};

export async function listFieldTypes(db: HrmsDb): Promise<FieldTypeOption[]> {
  const rows = await db.$queryRaw<
    Array<{ FieldTypeID: number; FieldType: string | null }>
  >`
    SELECT
        FieldType.FieldTypeID,
        FieldType.FieldType
    FROM dbo.TFieldType_LookUp AS FieldType
    WHERE ISNULL(FieldType.IsActive, 0) = 1
    ORDER BY FieldType.FieldType, FieldType.FieldTypeID
  `;
  return rows
    .filter((row) => row.FieldType != null && row.FieldType.trim() !== "")
    .map((row) => ({
      fieldTypeId: row.FieldTypeID,
      fieldType: row.FieldType?.trim() ?? "",
    }));
}

function mapFieldRow(row: FieldQueryRow): FieldCatalogRow {
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
    fieldTypeId: row.FieldTypeID,
    fieldType: row.FieldType,
    isMandatory: row.IsMandatory,
    isValidate: row.IsValidate,
    validationRule: row.ValidationRule,
    fieldTypeJsonSql: row.FieldType_JSON_SQL,
    isHidden: row.IsHidden,
    isActive: row.IsActive,
    isDefault: row.IsDefault,
    dbTable: row.DB_Table,
    dbColumn: row.DB_Column,
  };
}
