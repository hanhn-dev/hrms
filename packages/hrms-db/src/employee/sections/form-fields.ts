import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { requireResolvedEmployee } from "../../shared/employee";
import { loadEmployeeCountryId } from "../history/past-generic";
import {
  isCrudSectionId,
  sectionRecordSpecForId,
} from "./record-registry";

export type SectionFormField = {
  fieldId: number;
  sectionId: number;
  displayText: string;
  fieldName: string | null;
  displayOrder: number;
  fieldEntity: string | null;
  fieldTypeId: number | null;
  fieldType: string | null;
  isMandatory: boolean;
  isValidate: boolean;
  validationRule: string | null;
  isHidden: boolean;
  dbTable: string | null;
  dbColumn: string | null;
};

type FieldQueryRow = {
  FieldID: number;
  SectionID: number;
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
  DB_Table: string | null;
  DB_Column: string | null;
  EmployerId: number;
  CountryID: number;
};

function asBool(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
}

/**
 * Active non-Segment employer fields for a CRUD section.
 * Prefers tenant+country, then falls back to EmployerId/CountryID = 0.
 */
export async function listSectionFormFields(
  db: HrmsDb,
  input: {
    employerId: number;
    employmentNumber: string;
    sectionId: number;
  },
): Promise<SectionFormField[]> {
  if (!isCrudSectionId(input.sectionId)) {
    throw new Error(`Section ${input.sectionId} does not support record CRUD.`);
  }
  const spec = sectionRecordSpecForId(input.sectionId)!;
  const tenantId = parseEmployerId(input.employerId);
  const identity = await requireResolvedEmployee(
    db,
    tenantId,
    input.employmentNumber,
  );
  const countryId = await loadEmployeeCountryId(db, identity.employeeId);

  const rows = await db.$queryRaw<FieldQueryRow[]>`
    SELECT
        Fields.FieldID,
        Fields.SectionID,
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
        Fields.DB_Table,
        Fields.DB_Column,
        Fields.EmployerId,
        Fields.CountryID
    FROM dbo.TEmployeeDetail_Fields AS Fields
    LEFT JOIN dbo.TFieldType_LookUp AS FieldType
        ON FieldType.FieldTypeID = Fields.FieldTypeID
    WHERE Fields.SectionID = ${input.sectionId}
        AND Fields.EmployerId IN (${tenantId}, 0)
        AND Fields.CountryID IN (${countryId}, 0)
        AND ISNULL(Fields.IsDeleted, 0) = 0
        AND ISNULL(Fields.IsActive, 0) = 1
        AND ISNULL(Fields.FieldEntity, N'') <> N'Segment'
    ORDER BY Fields.DisplayOrder, Fields.FieldID
  `;

  const allowedTables = new Set(
    spec.tables.map((t) => t.liveTable.toLowerCase()),
  );

  const ranked = new Map<
    string,
    { score: number; field: SectionFormField }
  >();

  for (const row of rows) {
    const dbTable = row.DB_Table?.trim() || null;
    if (dbTable && !allowedTables.has(dbTable.toLowerCase())) {
      continue;
    }
    const displayText =
      row.DisplayText?.trim() ||
      row.FieldName?.trim() ||
      `Field ${row.FieldID}`;
    const dbColumn =
      row.DB_Column?.trim() ||
      (row.FieldEntity === "Custom" ? null : row.FieldName?.trim() || null);
    const partitionKey = `${row.FieldEntity === "Custom" ? `C:${row.FieldID}` : `S:${dbColumn ?? displayText}`}`;
    const score =
      (row.EmployerId === tenantId ? 0 : 2) +
      (row.CountryID === countryId ? 0 : 1);
    const field: SectionFormField = {
      fieldId: row.FieldID,
      sectionId: row.SectionID,
      displayText,
      fieldName: row.FieldName,
      displayOrder: Number(row.DisplayOrder ?? 0),
      fieldEntity: row.FieldEntity,
      fieldTypeId: row.FieldTypeID,
      fieldType: row.FieldType,
      isMandatory: asBool(row.IsMandatory),
      isValidate: asBool(row.IsValidate),
      validationRule: row.ValidationRule,
      isHidden: asBool(row.IsHidden),
      dbTable,
      dbColumn,
    };
    const existing = ranked.get(partitionKey);
    if (!existing || score < existing.score) {
      ranked.set(partitionKey, { score, field });
    }
  }

  return Array.from(ranked.values())
    .map((entry) => entry.field)
    .filter((field) => !field.isHidden)
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder || a.fieldId - b.fieldId,
    );
}
