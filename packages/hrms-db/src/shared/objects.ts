import { Prisma } from "../generated/prisma/client";
import type { HrmsDb } from "./client";
import { columnPresenceKey } from "./sql-names";

export { columnPresenceKey } from "./sql-names";

/** dbo table names that exist in the current database. */
export async function presentTables(
  db: HrmsDb,
  names: readonly string[],
): Promise<Set<string>> {
  const unique = [...new Set(names)];
  if (unique.length === 0) {
    return new Set();
  }
  const rows = await db.$queryRaw<Array<{ Name: string }>>`
    SELECT Tables.name AS Name
    FROM sys.tables AS Tables
    INNER JOIN sys.schemas AS Schemas
      ON Schemas.schema_id = Tables.schema_id
    WHERE Schemas.name = N'dbo'
      AND Tables.name IN (${Prisma.join(unique)})
  `;
  return new Set(rows.map((row) => row.Name));
}

/** dbo `table.column` pairs that exist, as `columnPresenceKey` values. */
export async function presentColumns(
  db: HrmsDb,
  pairs: readonly { table: string; column: string }[],
): Promise<Set<string>> {
  const requested = new Set(
    pairs.map((pair) => columnPresenceKey(pair.table, pair.column)),
  );
  if (requested.size === 0) {
    return new Set();
  }
  const tables = [...new Set(pairs.map((pair) => pair.table))];
  const columns = [...new Set(pairs.map((pair) => pair.column))];
  const rows = await db.$queryRaw<Array<{ TableName: string; ColumnName: string }>>`
    SELECT Tables.name AS TableName, Columns.name AS ColumnName
    FROM sys.columns AS Columns
    INNER JOIN sys.tables AS Tables
      ON Tables.object_id = Columns.object_id
    INNER JOIN sys.schemas AS Schemas
      ON Schemas.schema_id = Tables.schema_id
    WHERE Schemas.name = N'dbo'
      AND Tables.name IN (${Prisma.join(tables)})
      AND Columns.name IN (${Prisma.join(columns)})
  `;
  const present = new Set<string>();
  for (const row of rows) {
    const key = columnPresenceKey(row.TableName, row.ColumnName);
    if (requested.has(key)) {
      present.add(key);
    }
  }
  return present;
}
