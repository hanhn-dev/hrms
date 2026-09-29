import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, userIdSchema } from "../../shared/ids";
import { requireResolvedEmployee } from "../../shared/employee";
import { asNumber, sqlIdent, sqlTable } from "../history/sql";
import { listSectionFormFields, type SectionFormField } from "./form-fields";
import {
  isCrudSectionId,
  tableSpecFor,
  type SectionTableSpec,
} from "./record-registry";
import { softDeleteActiveSql, softDeleteMarkSql } from "./sql";

export type SectionRecordValues = Record<
  string,
  string | number | boolean | null | undefined
>;

export type SectionUpsertInput = {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  liveTable: string;
  entityKey?: number | null;
  values: SectionRecordValues;
  updatedBy: number;
};

export type SectionDeleteInput = {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  liveTable: string;
  entityKey: number;
  updatedBy: number;
};

function writableFieldsForTable(
  fields: SectionFormField[],
  liveTable: string,
): SectionFormField[] {
  return fields.filter(
    (f) =>
      f.dbTable != null &&
      f.dbTable.toLowerCase() === liveTable.toLowerCase() &&
      f.dbColumn != null &&
      f.dbColumn.trim() !== "" &&
      f.dbColumn.toLowerCase() !== "employeeid",
  );
}

function coerceSqlValue(
  value: string | number | boolean | null | undefined,
): string | number | boolean | null {
  if (value === undefined || value === "") return null;
  return value as string | number | boolean | null;
}

function pushAuditColumns(
  columns: string[],
  values: Prisma.Sql[],
  table: SectionTableSpec,
  updatedBy: number,
  mode: "insert" | "update",
): void {
  const audit = table.audit;
  if (!audit) return;
  const add = (name: string | undefined, sql: Prisma.Sql) => {
    if (!name || columns.includes(name)) return;
    columns.push(name);
    values.push(sql);
  };
  if (mode === "insert") {
    add(audit.createdBy, Prisma.sql`${updatedBy}`);
    add(audit.createdAt, Prisma.sql`GETDATE()`);
    add(audit.createdAtUtc, Prisma.sql`GETUTCDATE()`);
  }
  add(audit.updatedBy, Prisma.sql`${updatedBy}`);
  add(audit.updatedAt, Prisma.sql`GETDATE()`);
  add(audit.updatedAtUtc, Prisma.sql`GETUTCDATE()`);
}

function buildAuditUpdateSets(
  table: SectionTableSpec,
  updatedBy: number,
): Prisma.Sql[] {
  const sets: Prisma.Sql[] = [];
  const audit = table.audit;
  if (!audit) return sets;
  if (audit.updatedBy) {
    sets.push(Prisma.sql`${sqlIdent(audit.updatedBy)} = ${updatedBy}`);
  }
  if (audit.updatedAt) {
    sets.push(Prisma.sql`${sqlIdent(audit.updatedAt)} = GETDATE()`);
  }
  if (audit.updatedAtUtc) {
    sets.push(Prisma.sql`${sqlIdent(audit.updatedAtUtc)} = GETUTCDATE()`);
  }
  return sets;
}

export function previewSectionUpsertDiff(input: {
  liveTable: string;
  entityKey: number | null;
  before: SectionRecordValues | null;
  after: SectionRecordValues;
  fields: SectionFormField[];
}): Array<Record<string, unknown>> {
  const writable = writableFieldsForTable(input.fields, input.liveTable);
  const rows: Array<Record<string, unknown>> = [
    {
      Property: "Action",
      Current: input.entityKey == null ? "—" : "Update",
      Proposed: input.entityKey == null ? "Insert" : "Update",
    },
    {
      Property: "Table",
      Current: input.liveTable,
      Proposed: input.liveTable,
    },
    {
      Property: "EntityKey",
      Current: input.entityKey ?? "—",
      Proposed: input.entityKey ?? "(new)",
    },
  ];
  for (const field of writable) {
    const current = input.before?.[field.displayText] ?? null;
    const proposed = input.after[field.displayText] ?? null;
    if (String(current ?? "") === String(proposed ?? "")) continue;
    rows.push({
      Property: field.displayText,
      Current: current ?? "—",
      Proposed: proposed ?? "—",
    });
  }
  if (rows.length <= 3) {
    throw new Error("No field changes to save.");
  }
  return rows;
}

export async function loadSectionRecordValues(
  db: HrmsDb,
  input: {
    employerId: number;
    employmentNumber: string;
    sectionId: number;
    liveTable: string;
    entityKey: number;
  },
): Promise<SectionRecordValues | null> {
  const table = tableSpecFor(input.sectionId, input.liveTable);
  if (!table) {
    throw new Error(
      `Unknown table ${input.liveTable} for section ${input.sectionId}.`,
    );
  }
  const tenantId = parseEmployerId(input.employerId);
  const identity = await requireResolvedEmployee(
    db,
    tenantId,
    input.employmentNumber,
  );
  const fields = await listSectionFormFields(db, {
    employerId: tenantId,
    employmentNumber: input.employmentNumber,
    sectionId: input.sectionId,
  });
  const writable = writableFieldsForTable(fields, table.liveTable);
  const selectParts: Prisma.Sql[] = [
    Prisma.sql`${sqlIdent(table.entityKeyColumn)} AS [__EntityKey]`,
  ];
  const aliasByFieldId = new Map<number, string>();
  for (const field of writable) {
    const alias = `f_${field.fieldId}`;
    aliasByFieldId.set(field.fieldId, alias);
    selectParts.push(
      Prisma.sql`${sqlIdent(field.dbColumn!)} AS ${sqlIdent(alias)}`,
    );
  }
  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT ${Prisma.join(selectParts)}
    FROM ${sqlTable(table.liveTable)}
    WHERE ${sqlIdent(table.employeeIdColumn)} = ${identity.employeeId}
      AND ${sqlIdent(table.entityKeyColumn)} = ${input.entityKey}
      AND ${softDeleteActiveSql(table.softDelete)}
  `;
  const row = rows[0];
  if (!row) return null;
  const values: SectionRecordValues = {};
  for (const field of writable) {
    const alias = aliasByFieldId.get(field.fieldId)!;
    const raw =
      row[alias] ??
      Object.entries(row).find(
        ([k]) => k.toLowerCase() === alias.toLowerCase(),
      )?.[1];
    if (raw instanceof Date) {
      values[field.displayText] = raw.toISOString();
    } else if (typeof raw === "bigint") {
      values[field.displayText] = Number(raw);
    } else {
      values[field.displayText] =
        (raw as string | number | boolean | null) ?? null;
    }
  }
  return values;
}

export async function commitUpsertSectionRecord(
  db: HrmsDb,
  input: SectionUpsertInput,
): Promise<{ entityKey: number; liveTable: string }> {
  if (!isCrudSectionId(input.sectionId)) {
    throw new Error(`Section ${input.sectionId} does not support record CRUD.`);
  }
  const table = tableSpecFor(input.sectionId, input.liveTable);
  if (!table) {
    throw new Error(
      `Unknown table ${input.liveTable} for section ${input.sectionId}.`,
    );
  }
  const tenantId = parseEmployerId(input.employerId);
  const updatedBy = userIdSchema.parse(input.updatedBy);
  const identity = await requireResolvedEmployee(
    db,
    tenantId,
    input.employmentNumber,
  );
  const fields = await listSectionFormFields(db, {
    employerId: tenantId,
    employmentNumber: input.employmentNumber,
    sectionId: input.sectionId,
  });
  const writable = writableFieldsForTable(fields, table.liveTable);
  if (writable.length === 0) {
    throw new Error("No writable columns mapped for this section table.");
  }

  const entityKey =
    input.entityKey == null || input.entityKey === 0
      ? null
      : Number(input.entityKey);

  return db.$transaction(async (tx) => {
    if (entityKey != null) {
      const sets: Prisma.Sql[] = [];
      for (const field of writable) {
        if (!(field.displayText in input.values)) continue;
        sets.push(
          Prisma.sql`${sqlIdent(field.dbColumn!)} = ${coerceSqlValue(input.values[field.displayText])}`,
        );
      }
      const auditSets = buildAuditUpdateSets(table, updatedBy);
      if (sets.length === 0) {
        throw new Error("No field changes to save.");
      }
      sets.push(...auditSets);
      await tx.$executeRaw`
        UPDATE ${sqlTable(table.liveTable)}
        SET ${Prisma.join(sets)}
        WHERE ${sqlIdent(table.employeeIdColumn)} = ${identity.employeeId}
          AND ${sqlIdent(table.entityKeyColumn)} = ${entityKey}
          AND ${softDeleteActiveSql(table.softDelete)}
      `;
      return { entityKey, liveTable: table.liveTable };
    }

    const columnNames: string[] = [table.employeeIdColumn];
    const valueSql: Prisma.Sql[] = [Prisma.sql`${identity.employeeId}`];

    for (const field of writable) {
      if (!(field.displayText in input.values)) continue;
      if (columnNames.includes(field.dbColumn!)) continue;
      columnNames.push(field.dbColumn!);
      valueSql.push(
        Prisma.sql`${coerceSqlValue(input.values[field.displayText])}`,
      );
    }

    if (table.liveTable === "TEmployeeBankDetails") {
      if (!columnNames.includes("Show")) {
        columnNames.push("Show");
        valueSql.push(Prisma.sql`1`);
      }
      if (!columnNames.includes("IsDelete")) {
        columnNames.push("IsDelete");
        valueSql.push(Prisma.sql`0`);
      }
    }

    pushAuditColumns(columnNames, valueSql, table, updatedBy, "insert");

    const inserted = await tx.$queryRaw<Array<{ Id: number | bigint }>>`
      INSERT INTO ${sqlTable(table.liveTable)} (${Prisma.join(columnNames.map(sqlIdent))})
      OUTPUT INSERTED.${sqlIdent(table.entityKeyColumn)} AS [Id]
      VALUES (${Prisma.join(valueSql)})
    `;
    const newId = asNumber(inserted[0]?.Id);
    if (newId == null) {
      throw new Error("Insert did not return an entity key.");
    }
    return { entityKey: newId, liveTable: table.liveTable };
  });
}

export async function commitDeleteSectionRecord(
  db: HrmsDb,
  input: SectionDeleteInput,
): Promise<{ entityKey: number; liveTable: string }> {
  if (!isCrudSectionId(input.sectionId)) {
    throw new Error(`Section ${input.sectionId} does not support record CRUD.`);
  }
  const table = tableSpecFor(input.sectionId, input.liveTable);
  if (!table) {
    throw new Error(
      `Unknown table ${input.liveTable} for section ${input.sectionId}.`,
    );
  }
  if (table.softDelete.kind === "none") {
    throw new Error(
      `Delete is not supported for ${table.liveTable} (no soft-delete column).`,
    );
  }
  const tenantId = parseEmployerId(input.employerId);
  const updatedBy = userIdSchema.parse(input.updatedBy);
  const identity = await requireResolvedEmployee(
    db,
    tenantId,
    input.employmentNumber,
  );

  return db.$transaction(async (tx) => {
    const sets: Prisma.Sql[] = [
      softDeleteMarkSql(table.softDelete),
      ...buildAuditUpdateSets(table, updatedBy),
    ];
    await tx.$executeRaw`
      UPDATE ${sqlTable(table.liveTable)}
      SET ${Prisma.join(sets)}
      WHERE ${sqlIdent(table.employeeIdColumn)} = ${identity.employeeId}
        AND ${sqlIdent(table.entityKeyColumn)} = ${input.entityKey}
        AND ${softDeleteActiveSql(table.softDelete)}
    `;
    return { entityKey: input.entityKey, liveTable: table.liveTable };
  });
}

export function sectionTableSupportsDelete(
  sectionId: number,
  liveTable: string,
): boolean {
  const table = tableSpecFor(sectionId, liveTable);
  return table != null && table.softDelete.kind !== "none";
}
