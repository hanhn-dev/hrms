import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { parseUploadTypeKey, creationExcludedFieldNames, validationRuleNames } from "./classify";
import { likeContains, pageQuery, searchText, totalCountOf } from "../../shared/page.ts";
import {
  IMAGE_SECTION_ID,
  IMAGE_SECTION_NAME,
  PIPELINE_STEPS,
  UPLOAD_CATEGORY_ID,
  UPLOAD_TYPE_DB,
  UPLOAD_TYPE_LABELS,
  type UploadCatalog,
  type UploadCatalogField,
  type UploadCatalogListFilters,
  type UploadCatalogSection,
  type UploadCountryOption,
  type UploadTypeKey,
} from "./types";

type FieldQueryRow = {
  FieldID: number;
  SectionID: number;
  Section: string | null;
  FieldName: string | null;
  DisplayText: string | null;
  DisplayOrder: number | null;
  FieldEntity: string | null;
  FieldType: string | null;
  IsMandatory: boolean | number | null;
  IsValidate: boolean | number | null;
  IsHidden: boolean | number | null;
  IsActive: boolean | number | null;
  ValidationRule: string | null;
  FieldType_JSON_SQL: string | null;
  DB_Table: string | null;
  DB_Column: string | null;
  CountryID: number | null;
  CountryName: string | null;
};

type SectionQueryRow = {
  SectionID: number;
  Section: string | null;
  DB_DMLAllowed: string | null;
  DB_Table_History: string | null;
};

const CREATION_SECTIONS = ["Personal Details", "Current Employment Details"] as const;

export async function listUploadCountries(
  db: HrmsDb,
  employerId: number,
): Promise<UploadCountryOption[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<
    Array<{ CountryID: number; CountryName: string | null }>
  >`
    SELECT DISTINCT
        Fields.CountryID,
        Country.NICENAME AS CountryName
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Fields.CountryID
    WHERE Fields.EmployerId = ${tenantId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
        AND Fields.CountryID IS NOT NULL
        AND Fields.CountryID <> 0
    ORDER BY Country.NICENAME, Fields.CountryID
  `;
  return rows.map((row) => ({
    countryId: row.CountryID,
    countryName: row.CountryName ?? String(row.CountryID),
  }));
}

export async function listUploadCatalog(
  db: HrmsDb,
  employerId: number,
  type: UploadTypeKey,
  countryId = 0,
  filters: UploadCatalogListFilters = {},
): Promise<UploadCatalog> {
  const tenantId = parseEmployerId(employerId);
  const resolvedType = parseUploadTypeKey(type) ?? "profile";
  const resolvedCountryId =
    Number.isInteger(countryId) && countryId > 0 ? countryId : 0;

  if (resolvedType === "image") {
    return imageCatalog(db, tenantId, resolvedCountryId);
  }
  if (resolvedType === "creation") {
    return creationCatalog(db, tenantId, resolvedCountryId, filters);
  }
  return profileCatalog(db, tenantId, resolvedCountryId, filters);
}

async function profileCatalog(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
  filters: UploadCatalogListFilters,
): Promise<UploadCatalog> {
  const sections = await db.$queryRaw<SectionQueryRow[]>`
    SELECT
        Section.SectionID,
        Section.Section,
        Section.DB_DMLAllowed,
        Section.DB_Table_History
    FROM dbo.TEmployeeDetail_Section AS Section
    INNER JOIN dbo.TEmployeeDetail_Section_Category AS Map
        ON Map.SectionID = Section.SectionID
    WHERE Map.CategoryID = ${UPLOAD_CATEGORY_ID.profile}
        AND ISNULL(Section.IsActive, 1) = 1
    ORDER BY Section.SectionID
  `;
  const fieldOptions = {
    sectionNames: null,
    requireActiveVisible: false,
    excludedFieldNames: [] as string[],
    entities: null,
    allowedSectionIds: new Set(sections.map((section) => section.SectionID)),
  };
  const counts = await countCatalogFields(db, tenantId, countryId, fieldOptions);
  const fields = await listCatalogFields(
    db,
    tenantId,
    countryId,
    catalogFieldQuery(fieldOptions, filters, sections),
  );
  return {
    type: "profile",
    uploadType: UPLOAD_TYPE_DB.profile,
    label: UPLOAD_TYPE_LABELS.profile,
    categoryId: UPLOAD_CATEGORY_ID.profile,
    countryId,
    rowKey: "ID",
    pipeline: [
      ...PIPELINE_STEPS.slice(0, 3),
      "Process (section SPs → live tables)",
      "Processed",
    ],
    notes:
      sections.length === 0
        ? ["No sections are linked to CategoryID 1 (Bulk Profile Upload)."]
        : [],
    sections: toCatalogSections(sections, counts),
    fields: fields.rows,
    fieldTotalCount: fields.totalCount,
    fieldPage: fields.page,
    fieldPageSize: fields.pageSize,
  };
}

async function creationCatalog(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
  filters: UploadCatalogListFilters,
): Promise<UploadCatalog> {
  const settingsRows = await db.$queryRaw<
    Array<{
      IsGradeEnable: boolean | number | null;
      IsShowShiftRoaster: boolean | number | null;
    }>
  >`
    SELECT TOP (1)
        Settings.IsGradeEnable,
        Settings.IsShowShiftRoaster
    FROM dbo.TCustomerSettings AS Settings
    WHERE Settings.EmployerId = ${tenantId}
  `;
  const settings = {
    isGradeEnable: asFlag(settingsRows[0]?.IsGradeEnable),
    isShowShiftRoaster: asFlag(settingsRows[0]?.IsShowShiftRoaster),
  };
  const excluded = creationExcludedFieldNames(settings);
  const sections = await db.$queryRaw<SectionQueryRow[]>`
    SELECT
        Section.SectionID,
        Section.Section,
        Section.DB_DMLAllowed,
        Section.DB_Table_History
    FROM dbo.TEmployeeDetail_Section AS Section
    WHERE Section.Section IN (
        ${Prisma.join(CREATION_SECTIONS.map((name) => Prisma.sql`${name}`))}
    )
    ORDER BY Section.SectionID
  `;
  const fieldOptions = {
    sectionNames: [...CREATION_SECTIONS] as string[],
    requireActiveVisible: true,
    excludedFieldNames: excluded,
    entities: ["system", "custom", "country"],
  };
  const counts = await countCatalogFields(db, tenantId, countryId, fieldOptions);
  const fields = await listCatalogFields(
    db,
    tenantId,
    countryId,
    catalogFieldQuery(fieldOptions, filters, sections),
  );
  const notes = [
    "Template is Personal Details + Current Employment Details. Rows key off Work Email.",
    "Employment Number is excluded unless the creation template opts it in.",
  ];
  if (settings.isGradeEnable) {
    notes.push("Grade is excluded because IsGradeEnable is on.");
  }
  if (!settings.isShowShiftRoaster) {
    notes.push("ShiftGroup is excluded because IsShowShiftRoaster is off.");
  }
  return {
    type: "creation",
    uploadType: UPLOAD_TYPE_DB.creation,
    label: UPLOAD_TYPE_LABELS.creation,
    categoryId: UPLOAD_CATEGORY_ID.creation,
    countryId,
    rowKey: "Work Email",
    pipeline: [
      ...PIPELINE_STEPS.slice(0, 3),
      "Process (staging → TEmployee / TEmployeeInfo)",
      "Finalize employment numbers",
    ],
    notes,
    sections: toCatalogSections(sections, counts),
    fields: fields.rows,
    fieldTotalCount: fields.totalCount,
    fieldPage: fields.page,
    fieldPageSize: fields.pageSize,
  };
}

async function imageCatalog(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
): Promise<UploadCatalog> {
  const pictureFields = await listCatalogFields(db, tenantId, countryId, {
    sectionNames: ["Personal Details"],
    requireActiveVisible: false,
    excludedFieldNames: [],
    entities: null,
    displayTexts: ["Profile Picture", "ID", "Employee Name", "Employment Number"],
    unpaged: true,
  });
  const byDisplay = new Map(
    pictureFields.rows.map((field) => [
      (field.displayText ?? field.fieldName ?? "").trim().toLowerCase(),
      field,
    ]),
  );
  const fields: UploadCatalogField[] = [
    imageField(byDisplay.get("id"), {
      fieldId: -1,
      fieldName: "ID",
      displayText: "ID",
      fieldType: "Drop Down",
      isMandatory: true,
      dbTable: "TEmployee",
      dbColumn: "EmployeeId",
      validationRule: JSON.stringify([
        { rule: "required", errorMessage: "ID is required and must not be changed." },
      ]),
    }),
    imageField(byDisplay.get("employee name"), {
      fieldId: -2,
      fieldName: "Employee Name",
      displayText: "Employee Name",
      fieldType: "Free Text",
      isMandatory: true,
      dbTable: null,
      dbColumn: null,
      validationRule: JSON.stringify([
        { rule: "required", errorMessage: "Employee Name is required." },
      ]),
    }),
    imageField(byDisplay.get("employment number"), {
      fieldId: -3,
      fieldName: "Employment Number",
      displayText: "Employment Number",
      fieldType: "Free Text",
      isMandatory: true,
      dbTable: "TEmployeeInfo",
      dbColumn: "EmploymentNumber",
      validationRule: JSON.stringify([
        { rule: "required", errorMessage: "Employment Number is required." },
      ]),
    }),
    imageField(byDisplay.get("profile picture"), {
      fieldId: -4,
      fieldName: "Profile Picture",
      displayText: "Profile Picture",
      fieldType: "Free Text",
      isMandatory: true,
      dbTable: "TEmployeePictures",
      dbColumn: "EmployeePicture",
      validationRule: JSON.stringify([
        { rule: "required", errorMessage: "Profile Picture filename is required." },
        {
          rule: "pattern",
          params: { pattern: "\\.(jpg|jpeg|png|gif)$" },
          errorMessage: "Allowed extensions: .jpg, .jpeg, .png, .gif.",
        },
      ]),
    }),
  ];
  return {
    type: "image",
    uploadType: UPLOAD_TYPE_DB.image,
    label: UPLOAD_TYPE_LABELS.image,
    categoryId: UPLOAD_CATEGORY_ID.image,
    countryId,
    rowKey: "ID",
    pipeline: [
      ...PIPELINE_STEPS.slice(0, 3),
      "Process (image handler → TEmployeePictures)",
      "Processed",
    ],
    notes: [
      "Sheet name is Bulk Image Update. This is not a TEmployeeDetail_Section row.",
      "Zip filenames must match the Profile Picture column (case-insensitive).",
      "The number of images in the zip must match the number of employee rows.",
    ],
    sections: [
      {
        sectionId: IMAGE_SECTION_ID,
        section: IMAGE_SECTION_NAME,
        dmlAllowed: "U",
        historyTable: null,
        fieldCount: fields.length,
      },
    ],
    fields,
    fieldTotalCount: fields.length,
    fieldPage: 1,
    fieldPageSize: fields.length,
  };
}

type CatalogFieldOptions = {
  sectionNames: string[] | null;
  requireActiveVisible: boolean;
  excludedFieldNames: string[];
  entities: string[] | null;
  displayTexts?: string[];
  allowedSectionIds?: Set<number> | null;
  unpaged?: boolean;
} & UploadCatalogListFilters;

async function countCatalogFields(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
  options: CatalogFieldOptions,
): Promise<Map<number, number>> {
  const filters = catalogFieldFilters(countryId, options, false);
  const rows = await db.$queryRaw<Array<{ SectionID: number | null; FieldCount: number | bigint | null }>>`
    SELECT Fields.SectionID, COUNT(*) AS FieldCount
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = Fields.SectionID
    WHERE Fields.EmployerId = ${tenantId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
        ${filters}
    GROUP BY Fields.SectionID
  `;
  const counts = new Map<number, number>();
  for (const row of rows) {
    if (row.SectionID != null) {
      counts.set(row.SectionID, totalCountOf(row.FieldCount));
    }
  }
  return counts;
}

async function listCatalogFields(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
  options: CatalogFieldOptions,
): Promise<{
  rows: UploadCatalogField[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const paging = pageQuery(options.page, options.pageSize);
  const filters = catalogFieldFilters(countryId, options, true);
  const window = options.unpaged
    ? Prisma.empty
    : Prisma.sql`OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY`;
  const rows = await db.$queryRaw<Array<FieldQueryRow & { TotalCount: number | bigint | null }>>`
    SELECT
        Fields.FieldID,
        Fields.SectionID,
        Section.Section,
        Fields.FieldName,
        Fields.DisplayText,
        Fields.DisplayOrder,
        Fields.FieldEntity,
        FieldType.FieldType,
        Fields.IsMandatory,
        Fields.IsValidate,
        Fields.IsHidden,
        Fields.IsActive,
        Fields.ValidationRule,
        Fields.FieldType_JSON_SQL,
        Fields.DB_Table,
        Fields.DB_Column,
        Fields.CountryID,
        Country.NICENAME AS CountryName,
        COUNT(*) OVER() AS TotalCount
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = Fields.SectionID
    LEFT JOIN dbo.TFieldType_LookUp AS FieldType
        ON FieldType.FieldTypeID = Fields.FieldTypeID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Fields.CountryID
        AND Fields.CountryID <> 0
    WHERE Fields.EmployerId = ${tenantId}
        AND ISNULL(Fields.IsDeleted, 0) = 0
        ${filters}
    ORDER BY Fields.SectionID, Fields.DisplayOrder, Fields.FieldName, Fields.FieldID
    ${window}
  `;
  return {
    rows: rows.map(mapFieldRow),
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: options.unpaged ? 1 : paging.page,
    pageSize: options.unpaged ? rows.length : paging.pageSize,
  };
}

function catalogFieldQuery(
  fieldOptions: CatalogFieldOptions,
  filters: UploadCatalogListFilters,
  sections: SectionQueryRow[],
): CatalogFieldOptions {
  const concreteIds = (filters.sectionIds ?? []).filter((id) => Number.isInteger(id));
  const unpaged = concreteIds.length > 0;
  return {
    ...fieldOptions,
    ...filters,
    sectionIds: concreteIds,
    unpaged,
    sectionId: unpaged
      ? null
      : (filters.sectionId ?? sections[0]?.SectionID ?? null),
  };
}

function catalogFieldFilters(
  countryId: number,
  options: CatalogFieldOptions,
  includeSearch: boolean,
): Prisma.Sql {
  const countryFilter =
    countryId > 0
      ? Prisma.sql`AND Fields.CountryID IN (0, ${countryId})`
      : Prisma.sql`AND Fields.CountryID = 0`;
  const sectionFilter = options.sectionNames
    ? Prisma.sql`AND Section.Section IN (${Prisma.join(
        options.sectionNames.map((name) => Prisma.sql`${name}`),
      )})`
    : Prisma.empty;
  const allowed = [...(options.allowedSectionIds ?? [])];
  const allowedFilter =
    allowed.length > 0
      ? Prisma.sql`AND Fields.SectionID IN (${Prisma.join(allowed.map((id) => Prisma.sql`${id}`))})`
      : Prisma.empty;
  const requested = (options.sectionIds ?? []).filter((id) => Number.isInteger(id));
  const requestedFilter =
    requested.length > 0
      ? Prisma.sql`AND Fields.SectionID IN (${Prisma.join(requested.map((id) => Prisma.sql`${id}`))})`
      : Prisma.empty;
  const selectedId =
    includeSearch && options.sectionId != null && Number.isInteger(options.sectionId)
      ? options.sectionId
      : null;
  const selectedFilter =
    selectedId != null ? Prisma.sql`AND Fields.SectionID = ${selectedId}` : Prisma.empty;
  const visibilityFilter = options.requireActiveVisible
    ? Prisma.sql`AND ISNULL(Fields.IsActive, 0) = 1 AND ISNULL(Fields.IsHidden, 0) = 0`
    : Prisma.empty;
  const entityFilter = options.entities
    ? Prisma.sql`AND LOWER(LTRIM(RTRIM(ISNULL(Fields.FieldEntity, '')))) IN (${Prisma.join(
        options.entities.map((entity) => Prisma.sql`${entity}`),
      )})`
    : Prisma.empty;
  const excludedFilter =
    options.excludedFieldNames.length > 0
      ? Prisma.sql`AND LOWER(LTRIM(RTRIM(ISNULL(Fields.FieldName, '')))) NOT IN (${Prisma.join(
          options.excludedFieldNames.map((name) => Prisma.sql`${name}`),
        )})`
      : Prisma.empty;
  const displayFilter = options.displayTexts
    ? Prisma.sql`AND LOWER(LTRIM(RTRIM(ISNULL(Fields.DisplayText, '')))) IN (${Prisma.join(
        options.displayTexts.map((name) => Prisma.sql`${name.toLowerCase()}`),
      )})`
    : Prisma.empty;
  const q = includeSearch ? searchText(options.q) : null;
  const textFilter =
    q == null
      ? Prisma.empty
      : Prisma.sql`AND (
            Fields.FieldName LIKE ${likeContains(q)}
            OR Fields.DisplayText LIKE ${likeContains(q)}
            OR Fields.FieldEntity LIKE ${likeContains(q)}
        )`;
  return Prisma.sql`${countryFilter} ${sectionFilter} ${allowedFilter} ${requestedFilter} ${selectedFilter} ${visibilityFilter} ${entityFilter} ${excludedFilter} ${displayFilter} ${textFilter}`;
}

function mapFieldRow(row: FieldQueryRow): UploadCatalogField {
  return {
    fieldId: row.FieldID,
    sectionId: row.SectionID,
    section: row.Section ?? "Unsectioned",
    fieldName: row.FieldName,
    displayText: row.DisplayText,
    displayOrder: row.DisplayOrder == null ? null : Number(row.DisplayOrder),
    fieldEntity: row.FieldEntity,
    fieldType: row.FieldType,
    isMandatory: row.IsMandatory,
    isValidate: row.IsValidate,
    isHidden: row.IsHidden,
    isActive: row.IsActive,
    validationRule: row.ValidationRule,
    validationRuleNames: validationRuleNames(row.ValidationRule),
    fieldTypeJsonSql: row.FieldType_JSON_SQL,
    dbTable: row.DB_Table,
    dbColumn: row.DB_Column,
    countryId: row.CountryID,
    countryName: row.CountryName,
  };
}

function toCatalogSections(
  sections: SectionQueryRow[],
  counts: Map<number, number>,
): UploadCatalogSection[] {
  return sections.map((section) => ({
    sectionId: section.SectionID,
    section: section.Section ?? `Section ${section.SectionID}`,
    dmlAllowed: section.DB_DMLAllowed,
    historyTable: section.DB_Table_History,
    fieldCount: counts.get(section.SectionID) ?? 0,
  }));
}

function imageField(
  existing: UploadCatalogField | undefined,
  fallback: {
    fieldId: number;
    fieldName: string;
    displayText: string;
    fieldType: string;
    isMandatory: boolean;
    dbTable: string | null;
    dbColumn: string | null;
    validationRule: string;
  },
): UploadCatalogField {
  const validationRule = existing?.validationRule ?? fallback.validationRule;
  return {
    fieldId: existing?.fieldId ?? fallback.fieldId,
    sectionId: IMAGE_SECTION_ID,
    section: IMAGE_SECTION_NAME,
    fieldName: existing?.fieldName ?? fallback.fieldName,
    displayText: existing?.displayText ?? fallback.displayText,
    displayOrder: existing?.displayOrder ?? fallback.fieldId,
    fieldEntity: existing?.fieldEntity ?? "System",
    fieldType: existing?.fieldType ?? fallback.fieldType,
    isMandatory: existing?.isMandatory ?? fallback.isMandatory,
    isValidate: existing?.isValidate ?? true,
    isHidden: false,
    isActive: true,
    validationRule,
    validationRuleNames: validationRuleNames(validationRule),
    fieldTypeJsonSql: existing?.fieldTypeJsonSql ?? null,
    dbTable: existing?.dbTable ?? fallback.dbTable,
    dbColumn: existing?.dbColumn ?? fallback.dbColumn,
    countryId: existing?.countryId ?? 0,
    countryName: existing?.countryName ?? null,
  };
}

function asFlag(value: boolean | number | string | null | undefined): boolean {
  return value === true || value === 1 || value === "1";
}
