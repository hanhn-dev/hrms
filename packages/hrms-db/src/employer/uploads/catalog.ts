import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { parseUploadTypeKey, creationExcludedFieldNames, validationRuleNames } from "./classify";
import {
  IMAGE_SECTION_ID,
  IMAGE_SECTION_NAME,
  PIPELINE_STEPS,
  UPLOAD_CATEGORY_ID,
  UPLOAD_TYPE_DB,
  UPLOAD_TYPE_LABELS,
  type UploadCatalog,
  type UploadCatalogField,
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
): Promise<UploadCatalog> {
  const tenantId = parseEmployerId(employerId);
  const resolvedType = parseUploadTypeKey(type) ?? "profile";
  const resolvedCountryId =
    Number.isInteger(countryId) && countryId > 0 ? countryId : 0;

  if (resolvedType === "image") {
    return imageCatalog(db, tenantId, resolvedCountryId);
  }
  if (resolvedType === "creation") {
    return creationCatalog(db, tenantId, resolvedCountryId);
  }
  return profileCatalog(db, tenantId, resolvedCountryId);
}

async function profileCatalog(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
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
  const fields = await listCatalogFields(db, tenantId, countryId, {
    sectionNames: null,
    requireActiveVisible: false,
    excludedFieldNames: [],
    entities: null,
  });
  const sectionIds = new Set(sections.map((section) => section.SectionID));
  const scopedFields = fields.filter(
    (field) => field.sectionId > 0 && sectionIds.has(field.sectionId),
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
    sections: toCatalogSections(sections, scopedFields),
    fields: scopedFields,
  };
}

async function creationCatalog(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
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
  const fields = await listCatalogFields(db, tenantId, countryId, {
    sectionNames: [...CREATION_SECTIONS],
    requireActiveVisible: true,
    excludedFieldNames: excluded,
    entities: ["system", "custom", "country"],
  });
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
    sections: toCatalogSections(sections, fields),
    fields,
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
  });
  const byDisplay = new Map(
    pictureFields.map((field) => [
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
  };
}

async function listCatalogFields(
  db: HrmsDb,
  tenantId: number,
  countryId: number,
  options: {
    sectionNames: string[] | null;
    requireActiveVisible: boolean;
    excludedFieldNames: string[];
    entities: string[] | null;
    displayTexts?: string[];
  },
): Promise<UploadCatalogField[]> {
  const countryFilter =
    countryId > 0
      ? Prisma.sql`AND Fields.CountryID IN (0, ${countryId})`
      : Prisma.sql`AND Fields.CountryID = 0`;
  const sectionFilter = options.sectionNames
    ? Prisma.sql`AND Section.Section IN (${Prisma.join(
        options.sectionNames.map((name) => Prisma.sql`${name}`),
      )})`
    : Prisma.empty;
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

  const rows = await db.$queryRaw<FieldQueryRow[]>`
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
        Country.NICENAME AS CountryName
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
        ${countryFilter}
        ${sectionFilter}
        ${visibilityFilter}
        ${entityFilter}
        ${excludedFilter}
        ${displayFilter}
    ORDER BY Fields.SectionID, Fields.DisplayOrder, Fields.FieldName, Fields.FieldID
  `;
  return rows.map(mapFieldRow);
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
  fields: UploadCatalogField[],
): UploadCatalogSection[] {
  const counts = new Map<number, number>();
  for (const field of fields) {
    counts.set(field.sectionId, (counts.get(field.sectionId) ?? 0) + 1);
  }
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
