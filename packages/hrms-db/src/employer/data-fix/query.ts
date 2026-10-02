import { Prisma } from "../../generated/prisma/client";
import { assertSqlIdent, sqlIdent } from "../../employee/history/sql.ts";
import type { HrmsDb } from "../../shared/client.ts";
import { parseEmployerId } from "../../shared/ids.ts";
import { resolveEmployee } from "../../shared/employee/resolve.ts";
import { serializeRow } from "../../dbs/serialize-row.ts";
import {
  DATA_FIX_BROWSE_LIMIT,
  DATA_FIX_SAMPLE_ROWS,
  MAX_DATA_FIX_ROWS,
  browseFilters,
  browseOrderColumns,
  isBrowseColumnEditable,
  planColumnFilters,
  planDataFixBatch,
  normalizeColumnQuery,
  planDataFixWrite,
  rankColumnHits,
  rankTableHits,
  dataFixWriteBlock,
  type BrowseFilter,
  type ColumnBrowseFilter,
  type ColumnFilterInput,
  type DataFixBrowseColumn,
  type DataFixCellEdit,
  type DataFixColumnFacts,
  type DataFixColumnHit,
  type DataFixLiteral,
  type DataFixPlan,
  type DataFixTableHit,
} from "./guards.ts";

const COLUMN_SEARCH_CANDIDATES = 200;
const TABLE_SEARCH_CANDIDATES = 200;

export type DataFixRequest = {
  employerId: number;
  schema: string;
  table: string;
  column: string;
  matchNull: boolean;
  matchText: string | null;
  setNull: boolean;
  newText: string | null;
  employmentNumber: string | null;
};

export type DataFixPreview = {
  rowCount: number;
  schema: string;
  table: string;
  column: string;
  keyColumns: string[];
  sample: Array<Record<string, unknown>>;
};

export type DataFixBrowse = {
  schema: string;
  table: string;
  columns: Array<DataFixBrowseColumn & { editable: boolean }>;
  keyColumns: string[];
  employerColumn: string | null;
  rows: Array<Record<string, unknown>>;
  truncated: boolean;
  employerFiltered: boolean;
};

type TableSearchRow = {
  SchemaName: string;
  TableName: string;
  HasEmployerColumn: number | boolean | bigint;
};

type BrowseColumnRow = {
  ColumnName: string;
  TypeName: string;
  IsNullable: number | boolean | bigint;
  IsIdentity: number | boolean | bigint;
  IsComputed: number | boolean | bigint;
  IsPrimaryKey: number | boolean | bigint;
};

type SearchRow = {
  SchemaName: string;
  TableName: string;
  ColumnName: string;
  TypeName: string;
  IsNullable: number | boolean | bigint;
  HasEmployerColumn: number | boolean | bigint;
};

type FactRow = {
  ColumnName: string;
  TypeName: string;
  MaxLength: number | bigint;
  IsNullable: number | boolean | bigint;
  IsIdentity: number | boolean | bigint;
  IsComputed: number | boolean | bigint;
  IsPrimaryKey: number | boolean | bigint;
};

type CountRow = {
  MatchCount: number | bigint;
};

type SqlClient = {
  $queryRaw: HrmsDb["$queryRaw"];
  $executeRaw: HrmsDb["$executeRaw"];
};

export async function searchDataFixColumns(
  db: HrmsDb,
  query: string,
): Promise<DataFixColumnHit[]> {
  const normalized = normalizeColumnQuery(query);
  if (!normalized) {
    return [];
  }

  const contains = `%${escapeLikePattern(normalized)}%`;
  const prefix = `${escapeLikePattern(normalized)}%`;
  const rows = await db.$queryRaw<SearchRow[]>`
    SELECT TOP (${Prisma.raw(String(COLUMN_SEARCH_CANDIDATES))})
        Schemas.name AS SchemaName,
        Tables.name AS TableName,
        Columns.name AS ColumnName,
        Types.name AS TypeName,
        CAST(Columns.is_nullable AS int) AS IsNullable,
        CAST(CASE
            WHEN EXISTS (
                SELECT 1
                FROM sys.columns AS EmployerColumn
                WHERE EmployerColumn.object_id = Tables.object_id
                    AND LOWER(EmployerColumn.name) = N'employerid'
            ) THEN 1
            ELSE 0
        END AS int) AS HasEmployerColumn
    FROM sys.columns AS Columns
    INNER JOIN sys.tables AS Tables
        ON Tables.object_id = Columns.object_id
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    INNER JOIN sys.types AS Types
        ON Types.user_type_id = Columns.user_type_id
    WHERE Tables.is_ms_shipped = 0
        AND LOWER(Schemas.name) <> N'clone'
        AND LOWER(Schemas.name) <> N'sys'
        AND Columns.name LIKE ${contains} ESCAPE N'!'
    ORDER BY
        CASE
            WHEN LOWER(Columns.name) = LOWER(${normalized}) THEN 0
            WHEN Columns.name LIKE ${prefix} ESCAPE N'!' THEN 1
            ELSE 2
        END,
        Schemas.name,
        Tables.name,
        Columns.name
  `;

  return rankColumnHits(
    normalized,
    rows.map((row) => ({
      schema: row.SchemaName,
      table: row.TableName,
      column: row.ColumnName,
      typeName: row.TypeName,
      nullable: asFlag(row.IsNullable),
      hasEmployerColumn: asFlag(row.HasEmployerColumn),
    })),
  );
}

export async function searchDataFixTables(
  db: HrmsDb,
  query: string,
): Promise<DataFixTableHit[]> {
  const normalized = normalizeColumnQuery(query);
  if (!normalized) {
    return [];
  }

  const contains = `%${escapeLikePattern(normalized)}%`;
  const prefix = `${escapeLikePattern(normalized)}%`;
  const rows = await db.$queryRaw<TableSearchRow[]>`
    SELECT TOP (${Prisma.raw(String(TABLE_SEARCH_CANDIDATES))})
        Schemas.name AS SchemaName,
        Tables.name AS TableName,
        CAST(CASE
            WHEN EXISTS (
                SELECT 1
                FROM sys.columns AS EmployerColumn
                WHERE EmployerColumn.object_id = Tables.object_id
                    AND LOWER(EmployerColumn.name) = N'employerid'
            ) THEN 1
            ELSE 0
        END AS int) AS HasEmployerColumn
    FROM sys.tables AS Tables
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Tables.schema_id
    WHERE Tables.is_ms_shipped = 0
        AND LOWER(Schemas.name) <> N'clone'
        AND LOWER(Schemas.name) <> N'sys'
        AND Tables.name LIKE ${contains} ESCAPE N'!'
    ORDER BY
        CASE
            WHEN LOWER(Tables.name) = LOWER(${normalized}) THEN 0
            WHEN Tables.name LIKE ${prefix} ESCAPE N'!' THEN 1
            ELSE 2
        END,
        Schemas.name,
        Tables.name
  `;

  return rankTableHits(
    normalized,
    rows.map((row) => ({
      schema: row.SchemaName,
      table: row.TableName,
      hasEmployerColumn: asFlag(row.HasEmployerColumn),
    })),
  );
}

export async function browseDataFixTable(
  db: HrmsDb,
  input: {
    employerId: number;
    schema: string;
    table: string;
    value: string;
    newestFirst?: boolean;
    columnFilters?: readonly ColumnFilterInput[];
  },
): Promise<DataFixBrowse> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const table = assertSqlIdent(input.table.trim());
  if (schema.toLowerCase() === "sys" || schema.toLowerCase() === "clone") {
    throw new Error(`Table ${schema}.${table} was not found.`);
  }
  const employerId = parseEmployerId(input.employerId);
  const columns = await db.$queryRaw<BrowseColumnRow[]>`
    SELECT
        Columns.name AS ColumnName,
        Types.name AS TypeName,
        CAST(Columns.is_nullable AS int) AS IsNullable,
        CAST(Columns.is_identity AS int) AS IsIdentity,
        CAST(Columns.is_computed AS int) AS IsComputed,
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
        AND Tables.name = ${table}
        AND Tables.is_ms_shipped = 0
    ORDER BY Columns.column_id ASC
  `;
  if (columns.length === 0) {
    throw new Error(`Table ${schema}.${table} was not found.`);
  }

  const names = columns.map((column) => column.ColumnName);
  const employer = columns.find((column) => column.ColumnName.toLowerCase() === "employerid");
  const browseColumns = columns.map((column) => {
    const described: DataFixBrowseColumn = {
      name: column.ColumnName,
      typeName: column.TypeName,
      nullable: asFlag(column.IsNullable),
      identity: asFlag(column.IsIdentity),
      primaryKey: asFlag(column.IsPrimaryKey),
      computed: asFlag(column.IsComputed),
    };
    return {
      ...described,
      editable: isBrowseColumnEditable(described, Boolean(employer)),
    };
  });
  const keyColumns = browseColumns.some((column) => column.primaryKey)
    ? browseColumns.filter((column) => column.primaryKey).map((column) => column.name)
    : browseColumns.filter((column) => column.identity).map((column) => column.name);
  const described = columns.map((column) => ({
    name: column.ColumnName,
    typeName: column.TypeName,
  }));
  const columnPlan = planColumnFilters(described, input.columnFilters ?? []);
  if (!columnPlan.ok) {
    throw new Error(columnPlan.message);
  }
  const filters = browseFilters(described, input.value);
  if (input.value.trim() !== "" && filters.length === 0) {
    return {
      schema,
      table,
      columns: browseColumns,
      keyColumns,
      employerColumn: employer?.ColumnName ?? null,
      rows: [],
      truncated: false,
      employerFiltered: Boolean(employer),
    };
  }

  const newestFirst = input.newestFirst === true;
  const orderColumns = newestFirst
    ? browseOrderColumns(browseColumns)
    : columns
        .filter((column) => asFlag(column.IsPrimaryKey) || asFlag(column.IsIdentity))
        .map((column) => column.ColumnName);
  const fetchTop = DATA_FIX_BROWSE_LIMIT + 1;
  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (${Prisma.raw(String(fetchTop))})
        ${Prisma.join(names.map((name) => sqlIdent(name)))}
    FROM ${qualifiedTable(schema, table)}
    ${browseWhere(employer?.ColumnName ?? null, employerId, input.value, filters, columnPlan.filters)}
    ${orderBySql(orderColumns, newestFirst)}
  `;
  const truncated = rows.length > DATA_FIX_BROWSE_LIMIT;
  return {
    schema,
    table,
    columns: browseColumns,
    keyColumns,
    employerColumn: employer?.ColumnName ?? null,
    rows: (truncated ? rows.slice(0, DATA_FIX_BROWSE_LIMIT) : rows).map((row) => serializeRow(row)),
    truncated,
    employerFiltered: Boolean(employer),
  };
}

export async function commitDataFixBatch(
  db: HrmsDb,
  input: {
    employerId: number;
    schema: string;
    table: string;
    changes: DataFixCellEdit[];
  },
): Promise<number> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const table = assertSqlIdent(input.table.trim());
  const employerId = parseEmployerId(input.employerId);
  const described = await describeBrowseColumns(db, schema, table);
  const plan = planDataFixBatch({
    columns: described.columns,
    keyColumns: described.keyColumns,
    hasEmployerColumn: described.employerColumn != null,
    changes: input.changes,
  });
  const employerColumn = described.employerColumn;
  if (!employerColumn) {
    throw new Error("This table has no Employerid column, so it cannot be updated from Data Fix.");
  }
  let cellCount = 0;
  await db.$transaction(async (tx) => {
    for (const row of plan) {
      const affected = await tx.$executeRaw`
        UPDATE ${qualifiedTable(schema, table)}
        SET ${Prisma.join(row.sets.map((set) => assignmentSql(set.column, set.next)))}
        WHERE ${Prisma.join(
          [
            Prisma.sql`${sqlIdent(employerColumn)} = ${employerId}`,
            ...row.keys.map((key) => compareSql(key.column, key.value)),
            ...row.sets.map((set) => compareSql(set.column, set.previous)),
          ],
          " AND ",
        )}
      `;
      if (affected !== 1) {
        throw new Error("A row changed. Reload the table and try again.");
      }
      cellCount += row.sets.length;
    }
  });
  return cellCount;
}

async function describeBrowseColumns(
  db: HrmsDb,
  schema: string,
  table: string,
): Promise<{
  columns: DataFixBrowseColumn[];
  keyColumns: string[];
  employerColumn: string | null;
}> {
  const columns = await db.$queryRaw<BrowseColumnRow[]>`
    SELECT
        Columns.name AS ColumnName,
        Types.name AS TypeName,
        CAST(Columns.is_nullable AS int) AS IsNullable,
        CAST(Columns.is_identity AS int) AS IsIdentity,
        CAST(Columns.is_computed AS int) AS IsComputed,
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
        AND Tables.name = ${table}
        AND Tables.is_ms_shipped = 0
    ORDER BY Columns.column_id ASC
  `;
  if (columns.length === 0) {
    throw new Error(`Table ${schema}.${table} was not found.`);
  }
  const described = columns.map((column) => ({
    name: column.ColumnName,
    typeName: column.TypeName,
    nullable: asFlag(column.IsNullable),
    identity: asFlag(column.IsIdentity),
    primaryKey: asFlag(column.IsPrimaryKey),
    computed: asFlag(column.IsComputed),
  }));
  const employer = described.find((column) => column.name.toLowerCase() === "employerid");
  const keyColumns = described.some((column) => column.primaryKey)
    ? described.filter((column) => column.primaryKey).map((column) => column.name)
    : described.filter((column) => column.identity).map((column) => column.name);
  return {
    columns: described,
    keyColumns,
    employerColumn: employer?.name ?? null,
  };
}

function assignmentSql(column: string, value: DataFixLiteral): Prisma.Sql {
  if (value.kind === "null") {
    return Prisma.sql`${sqlIdent(column)} = NULL`;
  }
  return Prisma.sql`${sqlIdent(column)} = ${bindDataFixLiteral(value)}`;
}

function compareSql(column: string, value: DataFixLiteral): Prisma.Sql {
  if (value.kind === "null") {
    return Prisma.sql`${sqlIdent(column)} IS NULL`;
  }
  return Prisma.sql`${sqlIdent(column)} = ${bindDataFixLiteral(value)}`;
}

function bindDataFixLiteral(value: Exclude<DataFixLiteral, { kind: "null" }>): Prisma.Sql {
  switch (value.kind) {
    case "string":
    case "decimal":
    case "datetime":
      return Prisma.sql`${value.value}`;
    case "int":
      return Prisma.sql`${value.value}`;
    case "bit":
      return Prisma.sql`${value.value ? 1 : 0}`;
    default: {
      const unreachable: never = value;
      throw new Error(`Unsupported value ${String(unreachable)}.`);
    }
  }
}

function orderBySql(names: readonly string[], newestFirst: boolean): Prisma.Sql {
  if (names.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`ORDER BY ${Prisma.join(
    names.map((name) => (newestFirst ? Prisma.sql`${sqlIdent(name)} DESC` : sqlIdent(name))),
  )}`;
}

function browseWhere(
  employerColumn: string | null,
  employerId: number,
  rawValue: string,
  filters: BrowseFilter[],
  columnFilters: readonly ColumnBrowseFilter[],
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  if (employerColumn) {
    parts.push(Prisma.sql`${sqlIdent(employerColumn)} = ${employerId}`);
  }
  if (rawValue.trim() !== "" && filters.length > 0) {
    const pattern = `%${escapeLikePattern(rawValue.trim())}%`;
    parts.push(
      Prisma.sql`(${Prisma.join(
        filters.map((filter) => browsePredicate(filter, pattern)),
        " OR ",
      )})`,
    );
  }
  for (const filter of columnFilters) {
    parts.push(columnPredicate(filter));
  }
  if (parts.length === 0) {
    return Prisma.empty;
  }
  return Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}`;
}

function columnPredicate(filter: ColumnBrowseFilter): Prisma.Sql {
  switch (filter.kind) {
    case "text":
      return Prisma.sql`${sqlIdent(filter.name)} LIKE ${`%${escapeLikePattern(filter.text)}%`} ESCAPE N'!'`;
    case "number":
      return Prisma.sql`${sqlIdent(filter.name)} = ${filter.value}`;
    case "bit":
      return Prisma.sql`${sqlIdent(filter.name)} = ${filter.value ? 1 : 0}`;
    case "date":
      return Prisma.sql`CONVERT(nvarchar(30), ${sqlIdent(filter.name)}, 126) LIKE ${`%${escapeLikePattern(filter.text)}%`} ESCAPE N'!'`;
    default: {
      const unreachable: never = filter;
      throw new Error(`Unsupported filter ${String(unreachable)}.`);
    }
  }
}

function browsePredicate(filter: BrowseFilter, pattern: string): Prisma.Sql {
  switch (filter.kind) {
    case "text":
      return Prisma.sql`${sqlIdent(filter.name)} LIKE ${pattern} ESCAPE N'!'`;
    case "number":
      return Prisma.sql`${sqlIdent(filter.name)} = ${filter.value}`;
    case "bit":
      return Prisma.sql`${sqlIdent(filter.name)} = ${filter.value ? 1 : 0}`;
    case "date":
      return Prisma.sql`CONVERT(nvarchar(30), ${sqlIdent(filter.name)}, 126) LIKE ${pattern} ESCAPE N'!'`;
    default: {
      const unreachable: never = filter;
      throw new Error(`Unsupported filter ${String(unreachable)}.`);
    }
  }
}

export type DataFixColumnTarget = DataFixColumnFacts & {
  block: string | null;
};

export async function loadDataFixColumn(
  db: HrmsDb,
  input: { schema: string; table: string; column: string },
): Promise<DataFixColumnTarget | null> {
  const facts = await loadColumnFacts(db, input);
  if (!facts) {
    return null;
  }
  return { ...facts, block: dataFixWriteBlock(facts) };
}

export async function previewDataFix(
  db: HrmsDb,
  request: DataFixRequest,
): Promise<DataFixPreview> {
  const plan = await prepareDataFixPlan(db, request);
  const rowCount = await countMatches(db, plan);
  assertRowCount(rowCount);
  const sample = await selectSample(db, plan);
  return {
    rowCount,
    schema: plan.schema,
    table: plan.table,
    column: plan.column,
    keyColumns: plan.keyColumns,
    sample,
  };
}

export async function commitDataFix(
  db: HrmsDb,
  request: DataFixRequest,
  expectedCount: number,
): Promise<number> {
  if (!Number.isInteger(expectedCount) || expectedCount < 1 || expectedCount > MAX_DATA_FIX_ROWS) {
    throw new Error("Preview the fix again.");
  }
  const plan = await prepareDataFixPlan(db, request);
  return db.$transaction(async (tx) => {
    const rowCount = await countMatches(tx, plan);
    if (rowCount !== expectedCount) {
      throw new Error("The matching rows changed. Preview the fix again.");
    }
    assertRowCount(rowCount);
    const affected = await tx.$executeRaw`
      UPDATE ${qualifiedTable(plan.schema, plan.table)}
      SET ${assignment(plan)}
      WHERE ${whereClause(plan)}
    `;
    if (affected !== rowCount) {
      throw new Error("The update count did not match the preview.");
    }
    return affected;
  });
}

async function prepareDataFixPlan(
  db: HrmsDb,
  request: DataFixRequest,
): Promise<DataFixPlan> {
  const facts = await loadColumnFacts(db, request);
  if (!facts) {
    throw new Error(`Column ${request.column} was not found on ${request.schema}.${request.table}.`);
  }
  const employeeId = await resolveEmployeeFilter(db, request, facts);
  return planDataFixWrite({
    facts,
    employerId: parseEmployerId(request.employerId),
    employeeId,
    matchNull: request.matchNull,
    matchText: request.matchText,
    setNull: request.setNull,
    newText: request.newText,
  });
}

async function resolveEmployeeFilter(
  db: HrmsDb,
  request: DataFixRequest,
  facts: DataFixColumnFacts,
): Promise<number | null> {
  const employmentNumber = request.employmentNumber?.trim() ?? "";
  if (employmentNumber === "") {
    return null;
  }
  if (!facts.employeeColumn) {
    throw new Error("This table has no EmployeeId column.");
  }
  const employee = await resolveEmployee(db, request.employerId, employmentNumber);
  if (!employee) {
    throw new Error(`Employment number ${employmentNumber} was not found for this employer.`);
  }
  return employee.employeeId;
}

async function loadColumnFacts(
  db: HrmsDb,
  input: { schema: string; table: string; column: string },
): Promise<DataFixColumnFacts | null> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const table = assertSqlIdent(input.table.trim());
  const column = assertSqlIdent(input.column.trim());
  if (schema.toLowerCase() === "sys" || schema.toLowerCase() === "clone") {
    return null;
  }

  const rows = await db.$queryRaw<FactRow[]>`
    SELECT
        Columns.name AS ColumnName,
        Types.name AS TypeName,
        Columns.max_length AS MaxLength,
        CAST(Columns.is_nullable AS int) AS IsNullable,
        CAST(Columns.is_identity AS int) AS IsIdentity,
        CAST(Columns.is_computed AS int) AS IsComputed,
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
        AND Tables.name = ${table}
        AND Tables.is_ms_shipped = 0
    ORDER BY Columns.column_id ASC
  `;
  if (rows.length === 0) {
    return null;
  }

  const target = rows.find((row) => row.ColumnName.toLowerCase() === column.toLowerCase());
  if (!target) {
    return null;
  }
  const employer = rows.find((row) => row.ColumnName.toLowerCase() === "employerid");
  const employee = rows.find((row) => row.ColumnName.toLowerCase() === "employeeid");
  const keyColumns = rows.filter((row) => asFlag(row.IsPrimaryKey)).map((row) => row.ColumnName);
  const facts: DataFixColumnFacts = {
    schema,
    table,
    column: target.ColumnName,
    typeName: target.TypeName,
    maxLength: characterLength(target.TypeName, asNumber(target.MaxLength)),
    nullable: asFlag(target.IsNullable),
    identity: asFlag(target.IsIdentity),
    primaryKey: asFlag(target.IsPrimaryKey),
    computed: asFlag(target.IsComputed),
    hasEmployerColumn: Boolean(employer),
    employerColumn: employer?.ColumnName ?? null,
    employeeColumn: employee?.ColumnName ?? null,
    keyColumns,
  };
  return facts;
}

async function countMatches(db: SqlClient, plan: DataFixPlan): Promise<number> {
  const rows = await db.$queryRaw<CountRow[]>`
    SELECT COUNT_BIG(*) AS MatchCount
    FROM ${qualifiedTable(plan.schema, plan.table)}
    WHERE ${whereClause(plan)}
  `;
  return asNumber(rows[0]?.MatchCount ?? 0);
}

async function selectSample(
  db: SqlClient,
  plan: DataFixPlan,
): Promise<Array<Record<string, unknown>>> {
  const columns = [...new Set([...plan.keyColumns, plan.column])];
  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT TOP (${Prisma.raw(String(DATA_FIX_SAMPLE_ROWS))})
        ${Prisma.join(columns.map((name) => sqlIdent(name)))}
    FROM ${qualifiedTable(plan.schema, plan.table)}
    WHERE ${whereClause(plan)}
  `;
  return rows.map((row) => serializeRow(row));
}

function assertRowCount(rowCount: number): void {
  if (rowCount < 1) {
    throw new Error("No rows have that current value.");
  }
  if (rowCount > MAX_DATA_FIX_ROWS) {
    throw new Error(
      `${rowCount} rows match. Narrow the current value or add an employment number. Data Fix updates at most ${MAX_DATA_FIX_ROWS} rows.`,
    );
  }
}

function whereClause(plan: DataFixPlan): Prisma.Sql {
  const filters = [
    Prisma.sql`${sqlIdent(plan.employerColumn)} = ${plan.employerId}`,
    matchClause(plan.column, plan.match),
  ];
  if (plan.employeeColumn && plan.employeeId != null) {
    filters.push(Prisma.sql`${sqlIdent(plan.employeeColumn)} = ${plan.employeeId}`);
  }
  return Prisma.join(filters, " AND ");
}

function matchClause(column: string, match: DataFixLiteral): Prisma.Sql {
  if (match.kind === "null") {
    return Prisma.sql`${sqlIdent(column)} IS NULL`;
  }
  return Prisma.sql`${sqlIdent(column)} = ${bindLiteral(match)}`;
}

function assignment(plan: DataFixPlan): Prisma.Sql {
  if (plan.next.kind === "null") {
    return Prisma.sql`${sqlIdent(plan.column)} = NULL`;
  }
  return Prisma.sql`${sqlIdent(plan.column)} = ${bindLiteral(plan.next)}`;
}

function bindLiteral(value: Exclude<DataFixLiteral, { kind: "null" }>): Prisma.Sql {
  switch (value.kind) {
    case "string":
    case "decimal":
    case "datetime":
      return Prisma.sql`${value.value}`;
    case "int":
      return Prisma.sql`${value.value}`;
    case "bit":
      return Prisma.sql`${value.value ? 1 : 0}`;
    default: {
      const unreachable: never = value;
      throw new Error(`Unsupported value ${String(unreachable)}.`);
    }
  }
}

function qualifiedTable(schema: string, table: string): Prisma.Sql {
  return Prisma.raw(`[${assertSqlIdent(schema)}].[${assertSqlIdent(table)}]`);
}

function characterLength(typeName: string, maxLength: number): number | null {
  const type = typeName.toLowerCase();
  if (type !== "char" && type !== "varchar" && type !== "nchar" && type !== "nvarchar") {
    return null;
  }
  if (maxLength < 0) {
    return null;
  }
  if (type === "nchar" || type === "nvarchar") {
    return maxLength / 2;
  }
  return maxLength;
}

function asFlag(value: number | boolean | bigint): boolean {
  return value === true || value === 1 || value === 1n;
}

function asNumber(value: number | bigint): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[!%_[\]]/g, (ch) => `!${ch}`);
}
