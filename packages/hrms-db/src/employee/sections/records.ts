import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { requireResolvedEmployee } from "../../shared/employee";
import { asNumber, sqlIdent, sqlTable } from "../history/sql";
import { listSectionFormFields, type SectionFormField } from "./form-fields";
import {
  isCrudSectionId,
  sectionRecordSpecForId,
  type SectionTableSpec,
} from "./record-registry";
import { softDeleteActiveSql } from "./sql";
import {
  sectionLookupQuery,
  sectionLookupRefs,
  type SectionLookupRef,
} from "./section-lookups";

export type { SectionLookupRef } from "./section-lookups";

export type SectionRecordRow = {
  /** Stable key for UI: `${liveTable}:${entityKey}` */
  recordKey: string;
  liveTable: string;
  entityKey: number;
  values: Record<string, string | number | boolean | null>;
  lookups: Record<string, SectionLookupRef>;
};

function formatCellValue(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") return value;
  return String(value);
}

async function listRecordsForTable(
  db: HrmsDb,
  input: {
    employeeId: number;
    table: SectionTableSpec;
    fields: SectionFormField[];
  },
): Promise<SectionRecordRow[]> {
  const tableFields = input.fields.filter(
    (f) =>
      f.dbTable != null &&
      f.dbTable.toLowerCase() === input.table.liveTable.toLowerCase() &&
      f.dbColumn != null &&
      f.dbColumn.trim() !== "",
  );

  const source = sqlIdent("src");
  const selectParts: Prisma.Sql[] = [
    Prisma.sql`${source}.${sqlIdent(input.table.entityKeyColumn)} AS [__EntityKey]`,
  ];
  const aliasByFieldId = new Map<number, string>();
  for (const field of tableFields) {
    const alias = `f_${field.fieldId}`;
    aliasByFieldId.set(field.fieldId, alias);
    selectParts.push(
      Prisma.sql`${source}.${sqlIdent(field.dbColumn!)} AS ${sqlIdent(alias)}`,
    );
  }
  const lookupQuery = sectionLookupQuery(input.table.liveTable, tableFields);
  selectParts.push(...lookupQuery.selects);

  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT ${Prisma.join(selectParts)}
    FROM ${sqlTable(input.table.liveTable)} AS ${source}
    ${lookupQuery.joins}
    WHERE ${source}.${sqlIdent(input.table.employeeIdColumn)} = ${input.employeeId}
      AND ${softDeleteActiveSql(input.table.softDelete, "src")}
    ORDER BY ${source}.${sqlIdent(input.table.entityKeyColumn)}
  `;

  return rows.map((row) => {
    const entityKey = asNumber(row.__EntityKey ?? row.__entitykey);
    if (entityKey == null) {
      throw new Error(
        `Missing entity key on ${input.table.liveTable}.${input.table.entityKeyColumn}.`,
      );
    }
    const values: Record<string, string | number | boolean | null> = {};
    for (const field of tableFields) {
      const alias = aliasByFieldId.get(field.fieldId)!;
      const raw =
        row[alias] ??
        Object.entries(row).find(
          ([k]) => k.toLowerCase() === alias.toLowerCase(),
        )?.[1];
      values[field.displayText] = formatCellValue(raw);
    }
    const labelByField = new Map<string, string | null>();
    for (const binding of lookupQuery.bindings) {
      const field = tableFields.find((item) => item.fieldId === binding.fieldId);
      if (!field) continue;
      const raw =
        row[binding.alias] ??
        Object.entries(row).find(
          ([key]) => key.toLowerCase() === binding.alias.toLowerCase(),
        )?.[1];
      const label = raw == null ? null : String(raw).trim();
      labelByField.set(field.displayText, label === "" ? null : label);
    }
    return {
      recordKey: `${input.table.liveTable}:${entityKey}`,
      liveTable: input.table.liveTable,
      entityKey,
      values,
      lookups: sectionLookupRefs({
        liveTable: input.table.liveTable,
        fields: tableFields,
        values,
        labelByField,
      }),
    };
  });
}

export async function listSectionRecords(
  db: HrmsDb,
  input: {
    employerId: number;
    employmentNumber: string;
    sectionId: number;
  },
): Promise<{
  fields: SectionFormField[];
  records: SectionRecordRow[];
  label: string;
  sectionName: string;
}> {
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
  const fields = await listSectionFormFields(db, input);

  const records: SectionRecordRow[] = [];
  for (const table of spec.tables) {
    const tableRecords = await listRecordsForTable(db, {
      employeeId: identity.employeeId,
      table,
      fields,
    });
    records.push(...tableRecords);
  }

  return {
    fields,
    records,
    label: spec.label,
    sectionName: spec.sectionName,
  };
}
