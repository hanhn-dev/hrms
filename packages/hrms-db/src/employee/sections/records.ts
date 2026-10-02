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
  applyRelationshipLabels,
  collectRelationshipIds,
  relationshipDisplayTexts,
} from "./relationship-labels";

export type SectionRecordRow = {
  /** Stable key for UI: `${liveTable}:${entityKey}` */
  recordKey: string;
  liveTable: string;
  entityKey: number;
  values: Record<string, string | number | boolean | null>;
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

  const selectParts: Prisma.Sql[] = [
    Prisma.sql`${sqlIdent(input.table.entityKeyColumn)} AS [__EntityKey]`,
  ];
  const aliasByFieldId = new Map<number, string>();
  for (const field of tableFields) {
    const alias = `f_${field.fieldId}`;
    aliasByFieldId.set(field.fieldId, alias);
    selectParts.push(
      Prisma.sql`${sqlIdent(field.dbColumn!)} AS ${sqlIdent(alias)}`,
    );
  }

  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT ${Prisma.join(selectParts)}
    FROM ${sqlTable(input.table.liveTable)}
    WHERE ${sqlIdent(input.table.employeeIdColumn)} = ${input.employeeId}
      AND ${softDeleteActiveSql(input.table.softDelete)}
    ORDER BY ${sqlIdent(input.table.entityKeyColumn)}
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
    return {
      recordKey: `${input.table.liveTable}:${entityKey}`,
      liveTable: input.table.liveTable,
      entityKey,
      values,
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

  const relationshipTexts = relationshipDisplayTexts(fields);
  const relationshipIds = collectRelationshipIds(records, relationshipTexts);
  if (relationshipIds.length > 0) {
    const labels = await loadRelationshipLabels(db, relationshipIds);
    return {
      fields,
      records: applyRelationshipLabels(records, relationshipTexts, labels),
      label: spec.label,
      sectionName: spec.sectionName,
    };
  }

  return {
    fields,
    records,
    label: spec.label,
    sectionName: spec.sectionName,
  };
}

async function loadRelationshipLabels(
  db: HrmsDb,
  ids: number[],
): Promise<Map<number, string>> {
  const rows = await db.$queryRaw<
    Array<{ ID: number | bigint; Relationship: string | null }>
  >`
    SELECT ID, Relationship
    FROM dbo.TEmergencyRelationship
    WHERE ID IN (${Prisma.join(ids)})
  `;
  const labels = new Map<number, string>();
  for (const row of rows) {
    const id = asNumber(row.ID);
    const name = row.Relationship?.trim();
    if (id != null && name) labels.set(id, name);
  }
  return labels;
}
