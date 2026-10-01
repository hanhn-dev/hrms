import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, userIdSchema } from "../../shared/ids";
import { columnPresenceKey, presentColumns, presentTables } from "../../shared/objects";
import {
  MASTER_DATA_CATALOG,
  masterDataEmployerId,
  requireMasterDataEntry,
  type MasterDataColumn,
  type MasterDataEntry,
  type MasterDataRow,
  type MasterDataStamps,
  type MasterDataValue,
} from "./catalog.ts";
import { previewMasterDataWrite, type MasterDataWriteMode } from "./values.ts";

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

type Tx = Parameters<Parameters<HrmsDb["$transaction"]>[0]>[0];

function sqlIdent(name: string): Prisma.Sql {
  if (!SQL_IDENT.test(name)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return Prisma.raw(`[${name}]`);
}

function tableExists(tables: Set<string>, name: string): boolean {
  const wanted = name.toLowerCase();
  for (const table of tables) {
    if (table.toLowerCase() === wanted) {
      return true;
    }
  }
  return false;
}

function columnExists(
  columns: Set<string>,
  table: string,
  name: string,
): boolean {
  return columns.has(columnPresenceKey(table, name));
}

function pruneStamps(
  entry: MasterDataEntry,
  columns: Set<string>,
): MasterDataStamps | undefined {
  if (!entry.stamps) {
    return undefined;
  }
  const stamps: MasterDataStamps = {};
  for (const [key, name] of Object.entries(entry.stamps) as Array<
    [keyof MasterDataStamps, string | undefined]
  >) {
    if (name && columnExists(columns, entry.table, name)) {
      stamps[key] = name;
    }
  }
  return Object.keys(stamps).length > 0 ? stamps : undefined;
}

function pruneEntry(
  entry: MasterDataEntry,
  tables: Set<string>,
  columns: Set<string>,
): MasterDataEntry | null {
  if (!tableExists(tables, entry.table)) {
    return null;
  }
  if (!columnExists(columns, entry.table, entry.idColumn)) {
    return null;
  }
  if (entry.scope === "employer") {
    if (!entry.employerColumn || !columnExists(columns, entry.table, entry.employerColumn)) {
      return null;
    }
  }
  const kept = entry.columns.filter((column) =>
    columnExists(columns, entry.table, column.name),
  );
  if (kept.length === 0) {
    return null;
  }
  return {
    ...entry,
    columns: kept,
    stamps: pruneStamps(entry, columns),
  };
}

function presencePairs(entries: readonly MasterDataEntry[]): Array<{ table: string; column: string }> {
  const pairs: Array<{ table: string; column: string }> = [];
  for (const entry of entries) {
    pairs.push({ table: entry.table, column: entry.idColumn });
    if (entry.employerColumn) {
      pairs.push({ table: entry.table, column: entry.employerColumn });
    }
    for (const column of entry.columns) {
      pairs.push({ table: entry.table, column: column.name });
    }
    for (const name of Object.values(entry.stamps ?? {})) {
      if (name) {
        pairs.push({ table: entry.table, column: name });
      }
    }
  }
  return pairs;
}

export async function listAvailableMasterData(
  db: HrmsDb,
  employerId: number,
): Promise<MasterDataEntry[]> {
  parseEmployerId(employerId);
  const [tables, columns] = await Promise.all([
    presentTables(db, MASTER_DATA_CATALOG.map((entry) => entry.table)),
    presentColumns(db, presencePairs(MASTER_DATA_CATALOG)),
  ]);
  return MASTER_DATA_CATALOG.flatMap((entry) => {
    const pruned = pruneEntry(entry, tables, columns);
    return pruned ? [pruned] : [];
  });
}

function orderColumn(entry: MasterDataEntry): string {
  return entry.columns.find((column) => column.kind === "text")?.name ?? entry.idColumn;
}

function selectList(names: readonly string[]): Prisma.Sql {
  return Prisma.join(names.map((name) => sqlIdent(name)));
}

function asInt(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function serializeCell(column: MasterDataColumn, value: unknown): MasterDataValue {
  if (value == null) {
    return null;
  }
  if (column.kind === "bit") {
    if (typeof value === "boolean") {
      return value;
    }
    if (value === 1 || value === 0) {
      return value === 1;
    }
  }
  if (column.kind === "int") {
    return asInt(value);
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "bigint") {
    return String(value);
  }
  return null;
}

function serializeRow(entry: MasterDataEntry, raw: Record<string, unknown>): MasterDataRow {
  const row: MasterDataRow = {};
  const id = asInt(raw[entry.idColumn]);
  row[entry.idColumn] = id;
  for (const column of entry.columns) {
    row[column.name] = serializeCell(column, raw[column.name]);
  }
  return row;
}

async function selectRows(
  db: HrmsDb | Tx,
  entry: MasterDataEntry,
  employerId: number,
  id: number | null,
): Promise<MasterDataRow[]> {
  const names = [entry.idColumn, ...entry.columns.map((column) => column.name)];
  const scopedId = masterDataEmployerId(entry, employerId);
  const filters: Prisma.Sql[] = [];
  if (scopedId != null && entry.employerColumn) {
    filters.push(Prisma.sql`${sqlIdent(entry.employerColumn)} = ${scopedId}`);
  }
  if (id != null) {
    filters.push(Prisma.sql`${sqlIdent(entry.idColumn)} = ${id}`);
  }
  const where =
    filters.length > 0 ? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}` : Prisma.empty;
  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT ${selectList(names)}
    FROM dbo.${sqlIdent(entry.table)}
    ${where}
    ORDER BY ${sqlIdent(orderColumn(entry))}
  `;
  return rows.map((row) => serializeRow(entry, row));
}

export async function listMasterDataRows(
  db: HrmsDb,
  employerId: number,
  key: string,
): Promise<{ entry: MasterDataEntry; rows: MasterDataRow[] }> {
  const available = await listAvailableMasterData(db, employerId);
  const entry = available.find((item) => item.key === key);
  if (!entry) {
    throw new Error(`${requireMasterDataEntry(key).label} is not in this database.`);
  }
  const rows = await selectRows(db, entry, employerId, null);
  return { entry, rows };
}

export type MasterDataLookupOption = {
  id: number;
  label: string;
};

export type MasterDataPageData = {
  catalog: MasterDataEntry[];
  selected: MasterDataEntry | null;
  rows: MasterDataRow[];
  lookups: Record<string, MasterDataLookupOption[]>;
};

async function lookupOptions(
  db: HrmsDb,
  catalog: readonly MasterDataEntry[],
  entry: MasterDataEntry,
  employerId: number,
): Promise<Record<string, MasterDataLookupOption[]>> {
  const lookups: Record<string, MasterDataLookupOption[]> = {};
  const keys = new Set(
    entry.columns.map((column) => column.lookupKey).filter((key): key is string => Boolean(key)),
  );
  for (const key of keys) {
    const lookupEntry = catalog.find((item) => item.key === key);
    const labelColumn = entry.columns.find((column) => column.lookupKey === key)?.lookupLabelColumn;
    if (!lookupEntry || !labelColumn) {
      lookups[key] = [];
      continue;
    }
    const rows = await selectRows(db, lookupEntry, employerId, null);
    lookups[key] = rows.flatMap((row) => {
      const id = asInt(row[lookupEntry.idColumn]);
      if (id == null) {
        return [];
      }
      const label = row[labelColumn];
      return [{ id, label: label == null ? String(id) : String(label) }];
    });
  }
  return lookups;
}

export async function loadMasterDataPage(
  db: HrmsDb,
  employerId: number,
  key: string | null,
): Promise<MasterDataPageData> {
  const catalog = await listAvailableMasterData(db, employerId);
  const selected =
    (key ? catalog.find((entry) => entry.key === key) : catalog[0]) ?? null;
  if (!selected) {
    return { catalog, selected: null, rows: [], lookups: {} };
  }
  const rows = await selectRows(db, selected, employerId, null);
  const lookups = await lookupOptions(db, catalog, selected, employerId);
  return { catalog, selected, rows, lookups };
}

function boundValue(column: MasterDataColumn, value: MasterDataValue): Prisma.Sql {
  if (value == null) {
    return Prisma.sql`NULL`;
  }
  if (column.kind === "bit") {
    return Prisma.sql`${value === true ? 1 : 0}`;
  }
  if (column.kind === "int") {
    if (typeof value !== "number") {
      throw new Error(`${column.label} must be a whole number.`);
    }
    return Prisma.sql`${value}`;
  }
  return Prisma.sql`${String(value)}`;
}

function stampAssignments(
  entry: MasterDataEntry,
  mode: "insert" | "update",
  userId: number,
): Array<{ column: string; value: Prisma.Sql }> {
  const stamps = entry.stamps;
  if (!stamps) {
    return [];
  }
  const assignments: Array<{ column: string; value: Prisma.Sql }> = [];
  const by = Prisma.sql`${userId}`;
  const now = Prisma.sql`GETDATE()`;
  if (mode === "insert" && stamps.createdBy) {
    assignments.push({ column: stamps.createdBy, value: by });
  }
  if (mode === "insert" && stamps.createdDate) {
    assignments.push({ column: stamps.createdDate, value: now });
  }
  if (stamps.updatedBy && (mode === "update" || mode === "insert")) {
    if (mode === "update" || stamps.updatedBy !== stamps.createdBy) {
      assignments.push({ column: stamps.updatedBy, value: by });
    }
  }
  if (stamps.updatedDate && mode === "update") {
    assignments.push({ column: stamps.updatedDate, value: now });
  }
  return assignments;
}

async function requireCurrentRow(
  tx: Tx,
  entry: MasterDataEntry,
  employerId: number,
  id: number,
): Promise<MasterDataRow> {
  const rows = await selectRows(tx, entry, employerId, id);
  const row = rows[0];
  if (!row) {
    throw new Error(`${entry.label} was not found for this employer.`);
  }
  return row;
}

export async function commitMasterDataWrite(
  db: HrmsDb,
  input: {
    employerId: number;
    key: string;
    mode: MasterDataWriteMode;
    id: number | null;
    values: Record<string, unknown>;
    userId: number;
  },
): Promise<void> {
  const employerId = parseEmployerId(input.employerId);
  const userId = userIdSchema.parse(input.userId);
  const available = await listAvailableMasterData(db, employerId);
  const entry = available.find((item) => item.key === input.key);
  if (!entry) {
    throw new Error(`${requireMasterDataEntry(input.key).label} is not in this database.`);
  }

  await db.$transaction(async (tx) => {
    const mode = input.mode;
    const current =
      mode === "insert"
        ? null
        : await requireCurrentRow(tx, entry, employerId, requireRowId(input.id));
    const { values } = previewMasterDataWrite({
      entry,
      mode,
      current,
      values: input.values,
    });

    if (mode === "delete") {
      const scopedId = masterDataEmployerId(entry, employerId);
      const filters = [Prisma.sql`${sqlIdent(entry.idColumn)} = ${requireRowId(input.id)}`];
      if (scopedId != null && entry.employerColumn) {
        filters.push(Prisma.sql`${sqlIdent(entry.employerColumn)} = ${scopedId}`);
      }
      const affected = await tx.$executeRaw`
        DELETE FROM dbo.${sqlIdent(entry.table)}
        WHERE ${Prisma.join(filters, " AND ")}
      `;
      if (affected < 1) {
        throw new Error(`${entry.label} was not found for this employer.`);
      }
      return;
    }

    const assignments = Object.entries(values).map(([name, value]) => {
      const column = editableColumn(entry, mode, name);
      return { column: name, value: boundValue(column, value) };
    });
    assignments.push(...stampAssignments(entry, mode, userId));

    if (mode === "insert") {
      const scopedId = masterDataEmployerId(entry, employerId);
      if (scopedId != null && entry.employerColumn) {
        assignments.push({
          column: entry.employerColumn,
          value: Prisma.sql`${scopedId}`,
        });
      }
      const affected = await tx.$executeRaw`
        INSERT INTO dbo.${sqlIdent(entry.table)}
          (${Prisma.join(assignments.map((item) => sqlIdent(item.column)))})
        VALUES
          (${Prisma.join(assignments.map((item) => item.value))})
      `;
      if (affected < 1) {
        throw new Error(`${entry.label} was not saved.`);
      }
      return;
    }

    const scopedId = masterDataEmployerId(entry, employerId);
    const filters = [Prisma.sql`${sqlIdent(entry.idColumn)} = ${requireRowId(input.id)}`];
    if (scopedId != null && entry.employerColumn) {
      filters.push(Prisma.sql`${sqlIdent(entry.employerColumn)} = ${scopedId}`);
    }
    const affected = await tx.$executeRaw`
      UPDATE dbo.${sqlIdent(entry.table)}
      SET ${Prisma.join(
        assignments.map((item) => Prisma.sql`${sqlIdent(item.column)} = ${item.value}`),
      )}
      WHERE ${Prisma.join(filters, " AND ")}
    `;
    if (affected < 1) {
      throw new Error(`${entry.label} was not found for this employer.`);
    }
  });
}

function requireRowId(id: number | null): number {
  if (!Number.isInteger(id) || id == null || id <= 0) {
    throw new Error("Row id is required.");
  }
  return id;
}

function editableColumn(
  entry: MasterDataEntry,
  mode: "insert" | "update",
  name: string,
): MasterDataColumn {
  if (mode === "insert" && entry.idMode === "manual" && name === entry.idColumn) {
    return { name, label: "Id", kind: "int", required: true };
  }
  const column = entry.columns.find((item) => item.name === name);
  if (!column) {
    throw new Error(`${name} is not editable on ${entry.label}.`);
  }
  return column;
}
