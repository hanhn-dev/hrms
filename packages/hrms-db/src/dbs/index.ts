import { Prisma } from "../generated/prisma/client";
import type { HrmsDb } from "../shared/client";
import { parseEmployerId } from "../shared/ids";
import { assertSqlIdent, sqlIdent } from "../employee/history/sql";
import { parseExactNumeric } from "./exact-numeric";
import {
  formatTableDefinitionLine,
  type TableColumnDefinition,
} from "./table-definition";
import {
  collapsedModuleNameQuery,
  moduleNameSearchTokens,
} from "./module-name-search";
import { assertSelectOnly } from "./select-guard";
import { serializeRow } from "./serialize-row";
import { captureQueryScript } from "../shared/query-script";

export { assertSelectOnly } from "./select-guard";
export {
  executeFunction,
  type ExecuteFunctionInput,
  type ExecuteFunctionResult,
} from "./execute-function";

const MAX_TABLES_PER_SEARCH = 10;
const MAX_EXISTENCE_TABLES = 20;
const EXISTENCE_CONCURRENCY = 4;
const DEFAULT_TOP_PER_TABLE = 20;
const MAX_TOP_PER_TABLE = 50;
const DEFAULT_SELECT_MAX_ROWS = 200;
const MAX_SELECT_ROWS = 500;
const MAX_TABLE_LIST = 5000;
const TYPEAHEAD_TABLE_LIMIT = 50;
const MODULE_LIST_LIMIT = 50;
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
  queryScript?: string;
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

export type TableDefinition = {
  found: boolean;
  lines: string[];
};

type TableDefinitionRow = {
  ColumnName: string;
  TypeName: string;
  MaxLength: number | bigint;
  PrecisionValue: number | bigint;
  ScaleValue: number | bigint;
  IsNullable: number | boolean | bigint;
  IsIdentity: number | boolean | bigint;
  IsPrimaryKey: number | boolean | bigint;
};

function asDefinitionNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function asDefinitionFlag(value: number | boolean | bigint): boolean {
  return value === true || value === 1 || value === 1n;
}

export async function getTableDefinition(
  db: HrmsDb,
  input: { schema: string; name: string },
): Promise<TableDefinition> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const name = assertSqlIdent(input.name.trim());
  if (isIgnoredSchema(schema)) {
    return { found: false, lines: [] };
  }

  const rows = await db.$queryRaw<TableDefinitionRow[]>`
    SELECT
        Columns.name AS ColumnName,
        Types.name AS TypeName,
        Columns.max_length AS MaxLength,
        Columns.precision AS PrecisionValue,
        Columns.scale AS ScaleValue,
        CAST(Columns.is_nullable AS int) AS IsNullable,
        CAST(Columns.is_identity AS int) AS IsIdentity,
        CAST(CASE WHEN PkColumns.column_id IS NULL THEN 0 ELSE 1 END AS int) AS IsPrimaryKey
    FROM sys.columns AS Columns
    INNER JOIN sys.tables AS Tables
        ON Tables.object_id = Columns.object_id
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    INNER JOIN sys.types AS Types
        ON Types.user_type_id = Columns.user_type_id
    LEFT JOIN (
        SELECT
            IndexColumns.object_id,
            IndexColumns.column_id
        FROM sys.indexes AS Indexes
        INNER JOIN sys.index_columns AS IndexColumns
            ON IndexColumns.object_id = Indexes.object_id
            AND IndexColumns.index_id = Indexes.index_id
        WHERE Indexes.is_primary_key = 1
    ) AS PkColumns
        ON PkColumns.object_id = Columns.object_id
        AND PkColumns.column_id = Columns.column_id
    WHERE Schemas.name = ${schema}
        AND Tables.name = ${name}
        AND Tables.is_ms_shipped = 0
    ORDER BY Columns.column_id ASC
  `;

  if (rows.length === 0) {
    return { found: false, lines: [] };
  }

  const lines = rows.map((row) => {
    const column: TableColumnDefinition = {
      name: row.ColumnName,
      typeName: row.TypeName,
      maxLength: asDefinitionNumber(row.MaxLength),
      precision: asDefinitionNumber(row.PrecisionValue),
      scale: asDefinitionNumber(row.ScaleValue),
      nullable: asDefinitionFlag(row.IsNullable),
      identity: asDefinitionFlag(row.IsIdentity),
      primaryKey: asDefinitionFlag(row.IsPrimaryKey),
    };
    return formatTableDefinitionLine(column);
  });
  return { found: true, lines };
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
    const loaded = await captureQueryScript(async () => {
      try {
        return await searchOneTable(db, parsed, value, input.mode, employerId, top);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
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
        } satisfies ExploreSearchTableResult;
      }
    });
    results.push({ ...loaded.result, queryScript: loaded.script });
  }

  return results;
}

export type PreviewTableRowsInput = {
  schema?: string;
  table: string;
  employerId?: number | null;
  top?: number;
};

export type PreviewTableRowsResult = {
  schema: string;
  name: string;
  table: string;
  columns: ExploreColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  employerFiltered: boolean;
  hasEmployerColumn: boolean;
  queryScript?: string;
};

export async function previewTableRows(
  db: HrmsDb,
  input: PreviewTableRowsInput,
): Promise<PreviewTableRowsResult> {
  const loaded = await captureQueryScript(() => loadPreviewTableRows(db, input));
  return { ...loaded.result, queryScript: loaded.script };
}

async function loadPreviewTableRows(
  db: HrmsDb,
  input: PreviewTableRowsInput,
): Promise<PreviewTableRowsResult> {
  const schema = assertSqlIdent(input.schema?.trim() || "dbo");
  const name = assertSqlIdent(input.table.trim());
  const qualified = qualifyTableName(schema, name);
  const columns = await listTableColumns(db, name, schema);
  if (columns.length === 0) {
    throw new Error(`Table ${qualified} was not found or has no columns.`);
  }

  const employerCol = columns.find((c) => c.isEmployerColumn);
  const hasEmployerColumn = Boolean(employerCol);
  const employerId =
    input.employerId === null || input.employerId === undefined
      ? null
      : parseEmployerId(input.employerId);
  const employerFiltered = hasEmployerColumn && employerId !== null;
  const top = clampTop(input.top);
  const fetchTop = top + 1;

  const employerClause =
    employerFiltered && employerCol
      ? Prisma.sql`WHERE ${sqlIdent(employerCol.name)} = ${employerId}`
      : Prisma.empty;

  const rows = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT TOP (${Prisma.raw(String(fetchTop))})
        *
    FROM ${sqlQualifiedTable(schema, name)}
    ${employerClause}
  `;

  const truncated = rows.length > top;
  const limited = truncated ? rows.slice(0, top) : rows;

  return {
    schema,
    name,
    table: qualified,
    columns,
    rows: limited.map(serializeRow),
    rowCount: limited.length,
    truncated,
    employerFiltered,
    hasEmployerColumn,
  };
}

export type ExecuteSelectInput = {
  sql: string;
  maxRows?: number;
};

export type ExecuteSelectResult = {
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  maxRows: number;
};

function clampSelectRows(maxRows: number | undefined): number {
  if (maxRows === undefined || !Number.isFinite(maxRows)) {
    return DEFAULT_SELECT_MAX_ROWS;
  }
  return Math.min(MAX_SELECT_ROWS, Math.max(1, Math.trunc(maxRows)));
}

export async function executeSelect(
  db: HrmsDb,
  input: ExecuteSelectInput,
): Promise<ExecuteSelectResult> {
  const sql = assertSelectOnly(input.sql);
  const maxRows = clampSelectRows(input.maxRows);
  const fetchTop = maxRows + 1;

  // Wrap user SELECT so TOP is enforced even when the script omits it.
  const wrapped = `SELECT TOP (${fetchTop}) * FROM (${sql}) AS DbsSelect`;

  const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(wrapped);
  const truncated = rows.length > maxRows;
  const limited = truncated ? rows.slice(0, maxRows) : rows;

  return {
    rows: limited.map(serializeRow),
    rowCount: limited.length,
    truncated,
    maxRows,
  };
}

const SEARCHABLE_TYPE_NAMES = [
  ...STRING_TYPES,
  ...NUMERIC_TYPES,
  ...GUID_TYPES,
];

/** Temporary: Inspector hides this schema so copies do not sit beside dbo objects. */
const IGNORED_SCHEMAS = new Set(["clone"]);

const MODULE_TYPE_CODES = {
  storedProcedure: ["P"],
  function: ["FN", "IF", "TF"],
  view: ["V"],
} as const;

export type ModuleKind = keyof typeof MODULE_TYPE_CODES;

export type ScriptObjectKind = ModuleKind | "table";

export type SearchTarget = {
  schema: string;
  name: string;
  hasEmployerColumn: boolean;
  /** How many module dependencies reference this table. Higher means the app uses it more. */
  referenceCount: number;
};

export type ExistenceSearchInput = {
  /** Qualified names: `schema.table`. At most 20 per call. */
  tables: string[];
  value: string;
  mode: ExploreSearchMode;
  employerId: number | null;
};

export type ExistenceTableResult = {
  schema: string;
  name: string;
  table: string;
  exists: boolean;
  matchedColumns: string[];
  employerFiltered: boolean;
  hasEmployerColumn: boolean;
  error?: string;
};

export type ModuleSummary = {
  schema: string;
  name: string;
  kind: ModuleKind;
};

export type ModuleDefinition = {
  schema: string;
  name: string;
  kind: ModuleKind;
  definition: string | null;
  unavailableReason: string | null;
};

type SearchTargetRow = {
  SchemaName: string;
  TableName: string;
  HasEmployerColumn: number | boolean | null;
  ReferenceCount: number | bigint | null;
};

type BatchColumnRow = {
  SchemaName: string;
  TableName: string;
  ColumnName: string;
  TypeName: string;
};

type ModuleListRow = {
  SchemaName: string;
  ObjectName: string;
};

type ModuleDefinitionRow = {
  DefinitionText: string | null;
  IsEncrypted: number | boolean | null;
  HasSqlModule: number | boolean | null;
  HasViewDefinition: number | boolean | null;
};

function assertSearchMode(mode: string): ExploreSearchMode {
  if (mode === "exact" || mode === "contains") {
    return mode;
  }
  throw new Error('Search mode must be "exact" or "contains".');
}

function assertModuleKind(kind: string): ModuleKind {
  if (kind === "storedProcedure" || kind === "function" || kind === "view") {
    return kind;
  }
  throw new Error(
    'Module kind must be "storedProcedure", "function", or "view".',
  );
}

function isIgnoredSchema(schema: string): boolean {
  return IGNORED_SCHEMAS.has(schema.toLowerCase());
}

function ignoredSchemaSql(): Prisma.Sql {
  return Prisma.sql`AND LOWER(Schemas.name) NOT IN (${Prisma.join([...IGNORED_SCHEMAS])})`;
}

function isSafeIdent(name: string): boolean {
  try {
    assertSqlIdent(name);
    return true;
  } catch {
    return false;
  }
}

function asSqlFlag(
  value: number | boolean | bigint | null | undefined,
): boolean | null {
  if (value === true || value === 1 || value === 1n) {
    return true;
  }
  if (value === false || value === 0 || value === 0n) {
    return false;
  }
  return null;
}

function asCount(value: number | bigint | null | undefined): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 0;
}

function optionalEmployerId(employerId: number | null | undefined): number | null {
  if (employerId === null || employerId === undefined) {
    return null;
  }
  return parseEmployerId(employerId);
}

export async function listSearchTargets(db: HrmsDb): Promise<SearchTarget[]> {
  const rows = await db.$queryRaw<SearchTargetRow[]>`
    SELECT
        Schemas.name AS SchemaName,
        Tables.name AS TableName,
        MAX(CASE
            WHEN LOWER(Columns.name) = N'employerid' THEN 1
            ELSE 0
        END) AS HasEmployerColumn,
        ISNULL(MAX(Usage.ReferenceCount), 0) AS ReferenceCount
    FROM sys.tables AS Tables
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    INNER JOIN sys.columns AS Columns
        ON Columns.object_id = Tables.object_id
    INNER JOIN sys.types AS Types
        ON Types.user_type_id = Columns.user_type_id
    LEFT JOIN (
        SELECT
            Dependencies.referenced_id AS ObjectId,
            COUNT(*) AS ReferenceCount
        FROM sys.sql_expression_dependencies AS Dependencies
        WHERE Dependencies.referenced_id IS NOT NULL
        GROUP BY Dependencies.referenced_id
    ) AS Usage
        ON Usage.ObjectId = Tables.object_id
    WHERE Tables.is_ms_shipped = 0
        AND Types.name IN (${Prisma.join(SEARCHABLE_TYPE_NAMES)})
        ${ignoredSchemaSql()}
    GROUP BY Schemas.name, Tables.name
    ORDER BY Schemas.name ASC, Tables.name ASC
  `;

  return rows
    .filter(
      (row) =>
        !isIgnoredSchema(row.SchemaName) &&
        isSafeIdent(row.SchemaName) &&
        isSafeIdent(row.TableName),
    )
    .map((row) => ({
      schema: row.SchemaName,
      name: row.TableName,
      hasEmployerColumn: asSqlFlag(row.HasEmployerColumn) === true,
      referenceCount: asCount(row.ReferenceCount),
    }));
}

async function listColumnsForTables(
  db: HrmsDb,
  tables: ParsedTable[],
): Promise<Map<string, ExploreColumn[]>> {
  const keys = tables.map((table) => qualifyTableName(table.schema, table.name));
  const rows = await db.$queryRaw<BatchColumnRow[]>`
    SELECT
        Schemas.name AS SchemaName,
        Tables.name AS TableName,
        Columns.name AS ColumnName,
        Types.name AS TypeName
    FROM sys.tables AS Tables
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    INNER JOIN sys.columns AS Columns
        ON Columns.object_id = Tables.object_id
    INNER JOIN sys.types AS Types
        ON Types.user_type_id = Columns.user_type_id
    WHERE Tables.is_ms_shipped = 0
        AND (Schemas.name + N'.' + Tables.name) IN (${Prisma.join(keys)})
    ORDER BY Columns.column_id ASC
  `;

  const grouped = new Map<string, ExploreColumn[]>();
  for (const row of rows) {
    const key = qualifyTableName(row.SchemaName, row.TableName);
    if (!isSafeIdent(row.ColumnName)) {
      continue;
    }
    const columns = grouped.get(key) ?? [];
    columns.push({
      name: row.ColumnName,
      typeName: row.TypeName,
      searchable: isSearchableType(row.TypeName),
      isEmployerColumn: isEmployerColumnName(row.ColumnName),
    });
    grouped.set(key, columns);
  }
  return grouped;
}

async function existsInTable(
  db: HrmsDb,
  parsed: ParsedTable,
  columns: ExploreColumn[],
  value: string,
  mode: ExploreSearchMode,
  employerId: number | null,
): Promise<ExistenceTableResult | null> {
  const qualified = qualifyTableName(parsed.schema, parsed.name);
  const employerCol = columns.find((column) => column.isEmployerColumn);
  const hasEmployerColumn = Boolean(employerCol);
  const employerFiltered = hasEmployerColumn && employerId !== null;
  const { predicates, matchedColumns } =
    mode === "contains"
      ? buildContainsPredicates(columns, value)
      : buildExactPredicates(columns, value);

  if (predicates.length === 0) {
    return null;
  }

  const orClause = Prisma.join(predicates, " OR ");
  const employerClause =
    employerFiltered && employerCol
      ? Prisma.sql`AND ${sqlIdent(employerCol.name)} = ${employerId}`
      : Prisma.empty;

  const rows = await db.$queryRaw<Array<{ Found: number }>>`
    SELECT TOP (1) 1 AS Found
    FROM ${sqlQualifiedTable(parsed.schema, parsed.name)}
    WHERE (${orClause})
        ${employerClause}
  `;

  if (rows.length === 0) {
    return null;
  }

  return {
    schema: parsed.schema,
    name: parsed.name,
    table: qualified,
    exists: true,
    matchedColumns,
    employerFiltered,
    hasEmployerColumn,
  };
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapItem: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapItem(items[index]!);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function searchValueExistence(
  db: HrmsDb,
  input: ExistenceSearchInput,
): Promise<ExistenceTableResult[]> {
  const value = input.value.trim();
  if (value === "") {
    throw new Error("Search value is required.");
  }

  const mode = assertSearchMode(input.mode);
  const uniqueTables = [
    ...new Set(input.tables.map((table) => table.trim()).filter(Boolean)),
  ];
  if (uniqueTables.length === 0) {
    throw new Error("Select at least one table.");
  }
  if (uniqueTables.length > MAX_EXISTENCE_TABLES) {
    throw new Error(
      `Search at most ${MAX_EXISTENCE_TABLES} tables per batch.`,
    );
  }

  const parsedTables: ParsedTable[] = [];
  const parseErrors: ExistenceTableResult[] = [];
  for (const raw of uniqueTables) {
    try {
      parsedTables.push(parseQualifiedTable(raw));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      parseErrors.push({
        schema: "",
        name: raw,
        table: raw,
        exists: false,
        matchedColumns: [],
        employerFiltered: false,
        hasEmployerColumn: false,
        error: message,
      });
    }
  }

  const employerId = optionalEmployerId(input.employerId);
  const searchableTables = parsedTables.filter(
    (table) => !isIgnoredSchema(table.schema),
  );
  if (searchableTables.length === 0) {
    return parseErrors;
  }
  const columnsByTable = await listColumnsForTables(db, searchableTables);

  return mapWithConcurrency(
    searchableTables,
    EXISTENCE_CONCURRENCY,
    async (parsed) => {
      const qualified = qualifyTableName(parsed.schema, parsed.name);
      const columns = columnsByTable.get(qualified);
      if (!columns) {
        return {
          schema: parsed.schema,
          name: parsed.name,
          table: qualified,
          exists: false,
          matchedColumns: [],
          employerFiltered: false,
          hasEmployerColumn: false,
          error: `Table ${qualified} was not found.`,
        };
      }

      try {
        return await existsInTable(
          db,
          parsed,
          columns,
          value,
          mode,
          employerId,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          schema: parsed.schema,
          name: parsed.name,
          table: qualified,
          exists: false,
          matchedColumns: [],
          employerFiltered: false,
          hasEmployerColumn: columns.some((column) => column.isEmployerColumn),
          error: message,
        };
      }
    },
  ).then((results) => [
    ...parseErrors,
    ...results.filter((result): result is ExistenceTableResult => result !== null),
  ]);
}

export async function listModules(
  db: HrmsDb,
  input: { kind: ModuleKind; q?: string },
): Promise<ModuleSummary[]> {
  const kind = assertModuleKind(input.kind);
  const q = input.q?.trim() ?? "";
  if (q.length < MIN_TABLE_SEARCH_LENGTH) {
    return [];
  }

  const tokens = moduleNameSearchTokens(q);
  if (tokens.length === 0) {
    return [];
  }

  const qualifiedName = Prisma.sql`(Schemas.name + N'.' + Objects.name)`;
  const tokenFilters = Prisma.join(
    tokens.map((token) => {
      const pattern = `%${escapeLikePattern(token)}%`;
      return Prisma.sql`${qualifiedName} LIKE ${pattern}`;
    }),
    " AND ",
  );
  const collapsedPattern = `%${escapeLikePattern(collapsedModuleNameQuery(q))}%`;
  const typeCodes = [...MODULE_TYPE_CODES[kind]];
  const rows = await db.$queryRaw<ModuleListRow[]>`
    SELECT TOP (${Prisma.raw(String(MODULE_LIST_LIMIT))})
        Schemas.name AS SchemaName,
        Objects.name AS ObjectName
    FROM sys.objects AS Objects
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Objects.schema_id
    WHERE Objects.is_ms_shipped = 0
        AND RTRIM(Objects.type) IN (${Prisma.join(typeCodes)})
        ${ignoredSchemaSql()}
        AND ${tokenFilters}
    ORDER BY
        CASE
            WHEN REPLACE(${qualifiedName}, N'_', N'') LIKE ${collapsedPattern} THEN 0
            ELSE 1
        END,
        LEN(Objects.name),
        Schemas.name ASC,
        Objects.name ASC
  `;

  return rows
    .filter((row) => !isIgnoredSchema(row.SchemaName))
    .map((row) => ({
      schema: row.SchemaName,
      name: row.ObjectName,
      kind,
    }));
}

function moduleUnavailableReason(
  row: ModuleDefinitionRow | undefined,
  schema: string,
  name: string,
  kind: ModuleKind,
): string {
  const qualified = qualifyTableName(schema, name);
  if (!row) {
    return `Unable to find ${kind} ${qualified}.`;
  }
  if (asSqlFlag(row.IsEncrypted) === true) {
    return `${qualified} was created WITH ENCRYPTION, so SQL Server does not expose its script text.`;
  }
  if (asSqlFlag(row.HasViewDefinition) === false) {
    return `The current login does not have VIEW DEFINITION permission on ${qualified}.`;
  }
  if (asSqlFlag(row.HasSqlModule) === false) {
    return `SQL Server found ${qualified}, but it does not have a SQL module definition row.`;
  }
  return `Definition is unavailable for ${qualified}.`;
}

export async function getModuleDefinition(
  db: HrmsDb,
  input: { schema: string; name: string; kind: ModuleKind },
): Promise<ModuleDefinition> {
  const kind = assertModuleKind(input.kind);
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const name = assertSqlIdent(input.name.trim());
  if (isIgnoredSchema(schema)) {
    return {
      schema,
      name,
      kind,
      definition: null,
      unavailableReason: `Schema ${schema} is hidden in Inspector.`,
    };
  }
  const typeCodes = [...MODULE_TYPE_CODES[kind]];
  const rows = await db.$queryRaw<ModuleDefinitionRow[]>`
    SELECT
        OBJECT_DEFINITION(Objects.object_id) AS DefinitionText,
        CAST(OBJECTPROPERTYEX(Objects.object_id, 'IsEncrypted') AS int) AS IsEncrypted,
        CASE WHEN Modules.object_id IS NULL THEN 0 ELSE 1 END AS HasSqlModule,
        HAS_PERMS_BY_NAME(
            QUOTENAME(Schemas.name) + N'.' + QUOTENAME(Objects.name),
            N'OBJECT',
            N'VIEW DEFINITION'
        ) AS HasViewDefinition
    FROM sys.objects AS Objects
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Objects.schema_id
    LEFT JOIN sys.sql_modules AS Modules
        ON Modules.object_id = Objects.object_id
    WHERE Schemas.name = ${schema}
        AND Objects.name = ${name}
        AND RTRIM(Objects.type) IN (${Prisma.join(typeCodes)})
  `;

  const row = rows[0];
  const definition = row?.DefinitionText?.trim() ? row.DefinitionText : null;
  return {
    schema,
    name,
    kind,
    definition,
    unavailableReason: definition ? null : moduleUnavailableReason(row, schema, name, kind),
  };
}

type ScriptObjectRow = {
  SchemaName: string;
  ObjectName: string;
  TypeCode: string;
};

function scriptKindFromType(typeCode: string): ScriptObjectKind | null {
  switch (typeCode.trim().toUpperCase()) {
    case "P":
      return "storedProcedure";
    case "V":
      return "view";
    case "FN":
    case "IF":
    case "TF":
    case "FS":
    case "FT":
      return "function";
    case "U":
      return "table";
    default:
      return null;
  }
}

export async function findScriptObject(
  db: HrmsDb,
  input: { schema: string; name: string },
): Promise<{ schema: string; name: string; kind: ScriptObjectKind } | null> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const name = assertSqlIdent(input.name.trim());
  if (isIgnoredSchema(schema)) {
    return null;
  }
  const rows = await db.$queryRaw<ScriptObjectRow[]>`
    SELECT TOP (1)
        Schemas.name AS SchemaName,
        Objects.name AS ObjectName,
        RTRIM(Objects.type) AS TypeCode
    FROM sys.objects AS Objects
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Objects.schema_id
    WHERE Objects.is_ms_shipped = 0
        AND Schemas.name = ${schema}
        AND Objects.name = ${name}
  `;
  const row = rows[0];
  if (!row) {
    return null;
  }
  const kind = scriptKindFromType(row.TypeCode);
  if (!kind) {
    return null;
  }
  return {
    schema: row.SchemaName,
    name: row.ObjectName,
    kind,
  };
}

const SCRIPT_KIND_LOOKUP_LIMIT = 200;

export async function findScriptObjectKinds(
  db: HrmsDb,
  objects: ReadonlyArray<{ schema: string; name: string }>,
): Promise<Array<{ schema: string; name: string; kind: ScriptObjectKind }>> {
  const unique = new Map<string, { schema: string; name: string }>();
  for (const object of objects) {
    let schema: string;
    let name: string;
    try {
      schema = assertSqlIdent(object.schema.trim() || "dbo");
      name = assertSqlIdent(object.name.trim());
    } catch {
      continue;
    }
    if (isIgnoredSchema(schema)) {
      continue;
    }
    unique.set(`${schema}.${name}`.toLowerCase(), { schema, name });
    if (unique.size >= SCRIPT_KIND_LOOKUP_LIMIT) {
      break;
    }
  }
  const list = [...unique.values()];
  if (list.length === 0) {
    return [];
  }
  const predicates = list.map(
    (object) =>
      Prisma.sql`(Schemas.name = ${object.schema} AND Objects.name = ${object.name})`,
  );
  const rows = await db.$queryRaw<ScriptObjectRow[]>`
    SELECT
        Schemas.name AS SchemaName,
        Objects.name AS ObjectName,
        RTRIM(Objects.type) AS TypeCode
    FROM sys.objects AS Objects
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Objects.schema_id
    WHERE ${Prisma.join(predicates, " OR ")}
  `;
  const found: Array<{ schema: string; name: string; kind: ScriptObjectKind }> = [];
  for (const row of rows) {
    const kind = scriptKindFromType(row.TypeCode);
    if (!kind) {
      continue;
    }
    found.push({
      schema: row.SchemaName,
      name: row.ObjectName,
      kind,
    });
  }
  return found;
}
