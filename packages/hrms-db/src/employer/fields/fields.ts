import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import type { FieldCatalogRow } from "./fields-compare";

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
  IsHidden: boolean | number | null;
  IsActive: boolean | number | null;
  IsDefault: boolean | number | null;
  DB_Table: string | null;
  DB_Column: string | null;
};

export async function listEmployerFields(
  db: HrmsDb,
  employerId: number,
): Promise<FieldCatalogRow[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<FieldQueryRow[]>`
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
        Fields.FieldTypeID,
        FieldType.FieldType,
        Fields.IsMandatory,
        Fields.IsValidate,
        Fields.ValidationRule,
        Fields.IsHidden,
        Fields.IsActive,
        Fields.IsDefault,
        Fields.DB_Table,
        Fields.DB_Column
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
    ORDER BY Fields.SectionID, Fields.DisplayOrder, Fields.FieldName, Fields.FieldID
  `;
  return rows.map(mapFieldRow);
}

export async function listFieldTemplate(db: HrmsDb): Promise<FieldCatalogRow[]> {
  const rows = await db.$queryRaw<FieldQueryRow[]>`
    SELECT
        Master.FieldID,
        Master.SectionID,
        Section.Section,
        Master.EmployerId,
        Master.CountryID,
        Country.NICENAME AS CountryName,
        Master.FieldName,
        Master.DisplayText,
        Master.DisplayOrder,
        Master.FieldEntity,
        Master.FieldTypeID,
        FieldType.FieldType,
        Master.IsMandatory,
        Master.IsValidate,
        Master.ValidationRule,
        Master.IsHidden,
        Master.IsActive,
        Master.IsDefault,
        Master.DB_Table,
        Master.DB_Column
    FROM dbo.TEmployeeDetail_Fields_Master AS Master
    LEFT JOIN dbo.TEmployeeDetail_Section AS Section
        ON Section.SectionID = Master.SectionID
    LEFT JOIN dbo.TFieldType_LookUp AS FieldType
        ON FieldType.FieldTypeID = Master.FieldTypeID
    LEFT JOIN dbo.TCOUNTRY AS Country
        ON Country.ID = Master.CountryID
        AND Master.CountryID <> 0
    WHERE Master.EmployerId = ${TEMPLATE_EMPLOYER_ID}
        AND ISNULL(Master.IsDeleted, 0) = 0
    ORDER BY Master.SectionID, Master.DisplayOrder, Master.FieldName, Master.FieldID
  `;
  return rows.map(mapFieldRow);
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
    isHidden: row.IsHidden,
    isActive: row.IsActive,
    isDefault: row.IsDefault,
    dbTable: row.DB_Table,
    dbColumn: row.DB_Column,
  };
}
