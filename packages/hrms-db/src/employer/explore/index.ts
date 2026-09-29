import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { assertSqlIdent, sqlIdent } from "../../employee/history/sql";

const MAX_TABLES_PER_SEARCH = 10;
const DEFAULT_TOP_PER_TABLE = 20;
const MAX_TOP_PER_TABLE = 50;
const MAX_TABLE_LIST = 5000;
const TYPEAHEAD_TABLE_LIMIT = 50;
const MIN_TABLE_SEARCH_LENGTH = 2;

const STRING_TYPES = new Set([
  "char",
  "nchar",
  "varchar",
  "nvarchar",
  "text",
  "ntext",
  "sysname",
]);

const NUMERIC_TYPES = new Set([
  "tinyint",
  "smallint",
  "int",
  "bigint",
  "decimal",
  "numeric",
  "money",
  "smallmoney",
  "float",
  "real",
]);

const GUID_TYPES = new Set(["uniqueidentifier"]);

export type ExploreTable = {
  schema: string;
  name: string;
};

export type ExploreColumn = {
  name: string;
  typeName: string;
  searchable: boolean;
  isEmployerColumn: boolean;
};

export type ExploreSearchMode = "exact" | "contains";

export type ExploreSearchInput = {
  /** Qualified names: `schema.table` (schema defaults to dbo if omitted). */
  tables: string[];
  value: string;
  mode: ExploreSearchMode;
  employerId: number | null;
  topPerTable?: number;
};

export type ExploreSearchTableResult = {
  table: string;
  schema: string;
  name: string;
  exists: boolean;
  matchedColumns: string[];
  rowCount: number;
  rows: Record<string, unknown>[];
  truncated: boolean;
  employerFiltered: boolean;
  hasEmployerColumn: boolean;
  error?: string;
};

type SysTableRow = {
  SchemaName: string;
  name: string;
};

type SysColumnRow = {
  ColumnName: string;
  TypeName: string;
};

type ParsedTable = {
  schema: string;
  name: string;
};

export function qualifyTableName(schema: string, name: string): string {
  return `${schema}.${name}`;
}

export function parseQualifiedTable(raw: string): ParsedTable {
  const trimmed = raw.trim();
  if (trimmed === "") {
    throw new Error("Table name is required.");
  }
  const dot = trimmed.indexOf(".");
  if (dot === -1) {
    return { schema: "dbo", name: assertSqlIdent(trimmed) };
  }
  const schema = assertSqlIdent(trimmed.slice(0, dot));
  const name = assertSqlIdent(trimmed.slice(dot + 1));
  return { schema, name };
}

function sqlQualifiedTable(schema: string, name: string): Prisma.Sql {
  return Prisma.raw(
    `[${assertSqlIdent(schema)}].[${assertSqlIdent(name)}]`,
  );
}

function isEmployerColumnName(name: string): boolean {
  return name.toLowerCase() === "employerid";
}

function isStringType(typeName: string): boolean {
  return STRING_TYPES.has(typeName.toLowerCase());
}

function isNumericType(typeName: string): boolean {
  return NUMERIC_TYPES.has(typeName.toLowerCase());
}

function isGuidType(typeName: string): boolean {
  return GUID_TYPES.has(typeName.toLowerCase());
}

function isSearchableType(typeName: string): boolean {
  const t = typeName.toLowerCase();
  return STRING_TYPES.has(t) || NUMERIC_TYPES.has(t) || GUID_TYPES.has(t);
}

function escapeLikePattern(value: string): string {
  return value.replace(/[[\]%_]/g, (ch) => `[${ch}]`);
}

function parseExactNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || !/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseExactGuid(value: string): string | null {
  const trimmed = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  ) {
    return null;
  }
  return trimmed;
}

function clampTop(top: number | undefined): number {
  if (top === undefined || !Number.isFinite(top)) {
    return DEFAULT_TOP_PER_TABLE;
  }
  return Math.min(MAX_TOP_PER_TABLE, Math.max(1, Math.trunc(top)));
}

export async function listTables(
  db: HrmsDb,
  options: { q?: string; limit?: number } = {},
): Promise<ExploreTable[]> {
  const q = options.q?.trim() ?? "";
  if (q.length < MIN_TABLE_SEARCH_LENGTH) {
    return [];
  }

  const limitRaw = options.limit ?? TYPEAHEAD_TABLE_LIMIT;
  const limit = Math.min(
    MAX_TABLE_LIST,
    Math.max(1, Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : TYPEAHEAD_TABLE_LIMIT),
  );

  const pattern = `%${escapeLikePattern(q)}%`;
  const nameFilter = Prisma.sql`AND (
            Tables.name LIKE ${pattern}
            OR Schemas.name LIKE ${pattern}
            OR (Schemas.name + N'.' + Tables.name) LIKE ${pattern}
        )`;

  const rows = await db.$queryRaw<SysTableRow[]>`
    SELECT TOP (${Prisma.raw(String(limit))})
        Schemas.name AS SchemaName,
        Tables.name
    FROM sys.tables AS Tables
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    WHERE Tables.is_ms_shipped = 0
        ${nameFilter}
    ORDER BY Schemas.name ASC, Tables.name ASC
  `;

  return rows.map((row) => ({
    schema: row.SchemaName,
    name: row.name,
  }));
}

export async function listTableColumns(
  db: HrmsDb,
  tableName: string,
  schemaName = "dbo",
): Promise<ExploreColumn[]> {
  const schema = assertSqlIdent(schemaName);
  const name = assertSqlIdent(tableName);

  const rows = await db.$queryRaw<SysColumnRow[]>`
    SELECT
        Columns.name AS ColumnName,
        Types.name AS TypeName
    FROM sys.columns AS Columns
    INNER JOIN sys.tables AS Tables
        ON Tables.object_id = Columns.object_id
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    INNER JOIN sys.types AS Types
        ON Types.user_type_id = Columns.user_type_id
    WHERE Schemas.name = ${schema}
        AND Tables.name = ${name}
    ORDER BY Columns.column_id ASC
  `;

  return rows.map((row) => ({
    name: row.ColumnName,
    typeName: row.TypeName,
    searchable: isSearchableType(row.TypeName),
    isEmployerColumn: isEmployerColumnName(row.ColumnName),
  }));
}

function buildExactPredicates(
  columns: ExploreColumn[],
  value: string,
): { predicates: Prisma.Sql[]; matchedColumns: string[] } {
  const predicates: Prisma.Sql[] = [];
  const matchedColumns: string[] = [];
  const numeric = parseExactNumeric(value);
  const guid = parseExactGuid(value);

  for (const col of columns) {
    if (!col.searchable) {
      continue;
    }
    if (isStringType(col.typeName)) {
      predicates.push(Prisma.sql`${sqlIdent(col.name)} = ${value}`);
      matchedColumns.push(col.name);
      continue;
    }
    if (isNumericType(col.typeName) && numeric !== null) {
      predicates.push(Prisma.sql`${sqlIdent(col.name)} = ${numeric}`);
      matchedColumns.push(col.name);
      continue;
    }
    if (isGuidType(col.typeName) && guid !== null) {
      predicates.push(Prisma.sql`${sqlIdent(col.name)} = ${guid}`);
      matchedColumns.push(col.name);
    }
  }

  return { predicates, matchedColumns };
}

function buildContainsPredicates(
  columns: ExploreColumn[],
  value: string,
): { predicates: Prisma.Sql[]; matchedColumns: string[] } {
  const pattern = `%${escapeLikePattern(value)}%`;
  const predicates: Prisma.Sql[] = [];
  const matchedColumns: string[] = [];

  for (const col of columns) {
    if (!col.searchable || !isStringType(col.typeName)) {
      continue;
    }
    predicates.push(
      Prisma.sql`CONVERT(nvarchar(max), ${sqlIdent(col.name)}) LIKE ${pattern}`,
    );
    matchedColumns.push(col.name);
  }

  return { predicates, matchedColumns };
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      out[key] = value.toString();
    } else if (
      value != null &&
      typeof value === "object" &&
      "byteLength" in value &&
      typeof (value as { byteLength: unknown }).byteLength === "number"
    ) {
      out[key] = `[binary ${(value as { byteLength: number }).byteLength} bytes]`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function searchOneTable(
  db: HrmsDb,
  parsed: ParsedTable,
  value: string,
  mode: ExploreSearchMode,
  employerId: number | null,
  top: number,
): Promise<ExploreSearchTableResult> {
  const qualified = qualifyTableName(parsed.schema, parsed.name);
  const columns = await listTableColumns(db, parsed.name, parsed.schema);
  const employerCol = columns.find((c) => c.isEmployerColumn);
  const hasEmployerColumn = Boolean(employerCol);
  const employerFiltered = hasEmployerColumn && employerId !== null;

  const { predicates, matchedColumns } =
    mode === "contains"
      ? buildContainsPredicates(columns, value)
      : buildExactPredicates(columns, value);

  if (predicates.length === 0) {
    return {
      table: qualified,
      schema: parsed.schema,
      name: parsed.name,
      exists: false,
      matchedColumns: [],
      rowCount: 0,
      rows: [],
      truncated: false,
      employerFiltered,
      hasEmployerColumn,
      error:
        mode === "contains"
          ? "No string columns to search with Contains."
          : "No searchable columns match this value type.",
    };
  }

  const orClause = Prisma.join(predicates, " OR ");
  const employerClause =
    employerFiltered && employerCol
      ? Prisma.sql`AND ${sqlIdent(employerCol.name)} = ${employerId}`
      : Prisma.empty;

  const fetchTop = top + 1;
  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT TOP (${Prisma.raw(String(fetchTop))})
        *
    FROM ${sqlQualifiedTable(parsed.schema, parsed.name)}
    WHERE (${orClause})
        ${employerClause}
  `;

  const truncated = rows.length > top;
  const limited = truncated ? rows.slice(0, top) : rows;

  return {
    table: qualified,
    schema: parsed.schema,
    name: parsed.name,
    exists: limited.length > 0,
    matchedColumns,
    rowCount: limited.length,
    rows: limited.map(serializeRow),
    truncated,
    employerFiltered,
    hasEmployerColumn,
  };
}

export async function searchValueInTables(
  db: HrmsDb,
  input: ExploreSearchInput,
): Promise<ExploreSearchTableResult[]> {
  const value = input.value.trim();
  if (value === "") {
    throw new Error("Search value is required.");
  }

  if (input.mode !== "exact" && input.mode !== "contains") {
    throw new Error('Search mode must be "exact" or "contains".');
  }

  const uniqueTables = [
    ...new Set(input.tables.map((t) => t.trim()).filter(Boolean)),
  ];
  if (uniqueTables.length === 0) {
    throw new Error("Select at least one table.");
  }
  if (uniqueTables.length > MAX_TABLES_PER_SEARCH) {
    throw new Error(
      `Select at most ${MAX_TABLES_PER_SEARCH} tables per search.`,
    );
  }

  const parsedTables = uniqueTables.map(parseQualifiedTable);

  const employerId =
    input.employerId === null || input.employerId === undefined
      ? null
      : parseEmployerId(input.employerId);

  const top = clampTop(input.topPerTable);
  const results: ExploreSearchTableResult[] = [];

  for (const parsed of parsedTables) {
    const qualified = qualifyTableName(parsed.schema, parsed.name);
    try {
      results.push(
        await searchOneTable(db, parsed, value, input.mode, employerId, top),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        table: qualified,
        schema: parsed.schema,
        name: parsed.name,
        exists: false,
        matchedColumns: [],
        rowCount: 0,
        rows: [],
        truncated: false,
        employerFiltered: false,
        hasEmployerColumn: false,
        error: message,
      });
    }
  }

  return results;
}
