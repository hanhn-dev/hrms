import { Prisma } from "../generated/prisma/client.ts";
import { assertSqlIdent } from "../employee/history/sql.ts";
import type { HrmsDb } from "../shared/client.ts";

/** How many related modules one inspector action opens. */
export const RELATED_MODULE_LIMIT = 40;

/** Nested calls stop after this many steps from the source object. */
export const NESTED_MODULE_DEPTH = 5;

const MODULE_TYPE_CODES = ["P", "V", "FN", "IF", "TF"] as const;

/** Matches the schema Inspector hides so clone copies do not appear as dbo. */
const IGNORED_SCHEMAS = ["clone"] as const;

export type RelatedModuleKind = "storedProcedure" | "function" | "view";

export type RelatedModule = {
  schema: string;
  name: string;
  kind: RelatedModuleKind;
  depth: number;
};

export type RelatedModuleList = {
  items: RelatedModule[];
  total: number;
  truncated: boolean;
};

type RelationSqlRow = {
  SchemaName: string;
  ObjectName: string;
  TypeCode: string;
  Depth: number | bigint | null;
};

function objectKey(schema: string, name: string): string {
  return `${schema}.${name}`.toLowerCase();
}

function moduleKindFromType(typeCode: string): RelatedModuleKind | null {
  switch (typeCode.trim().toUpperCase()) {
    case "P":
      return "storedProcedure";
    case "V":
      return "view";
    case "FN":
    case "IF":
    case "TF":
      return "function";
    default:
      return null;
  }
}

function isIgnoredSchema(schema: string): boolean {
  return IGNORED_SCHEMAS.some((ignored) => ignored === schema.toLowerCase());
}

function readIdent(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    return assertSqlIdent(value.trim());
  } catch {
    return null;
  }
}

function readDepth(value: number | bigint | null | undefined): number {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return 1;
}

function compareModules(left: RelatedModule, right: RelatedModule): number {
  if (left.depth !== right.depth) {
    return left.depth - right.depth;
  }
  const schemaComparison = left.schema.localeCompare(right.schema, undefined, {
    sensitivity: "base",
  });
  if (schemaComparison !== 0) {
    return schemaComparison;
  }
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

/**
 * Drops the source object, keeps the shallowest depth for each module, sorts,
 * and caps the list. Callers are depth 1. Nested calls use the walk depth.
 */
export function shapeRelatedModules(
  rows: readonly RelatedModule[],
  source: { schema: string; name: string },
  limit = RELATED_MODULE_LIMIT,
): RelatedModuleList {
  const sourceKey = objectKey(source.schema, source.name);
  const best = new Map<string, RelatedModule>();
  for (const row of rows) {
    const key = objectKey(row.schema, row.name);
    if (key === sourceKey) {
      continue;
    }
    const existing = best.get(key);
    if (!existing || row.depth < existing.depth) {
      best.set(key, row);
    }
  }
  const sorted = [...best.values()].sort(compareModules);
  return {
    items: sorted.slice(0, limit),
    total: sorted.length,
    truncated: sorted.length > limit,
  };
}

function rowsToModules(rows: readonly RelationSqlRow[]): RelatedModule[] {
  const modules: RelatedModule[] = [];
  for (const row of rows) {
    const schema = readIdent(row.SchemaName);
    const name = readIdent(row.ObjectName);
    const kind = moduleKindFromType(row.TypeCode);
    if (!schema || !name || !kind || isIgnoredSchema(schema)) {
      continue;
    }
    modules.push({
      schema,
      name,
      kind,
      depth: readDepth(row.Depth),
    });
  }
  return modules;
}

function moduleTypeSql(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`RTRIM(${column}) IN (${Prisma.join([...MODULE_TYPE_CODES])})`;
}

function visibleSchemaSql(column: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`LOWER(${column}) NOT IN (${Prisma.join([...IGNORED_SCHEMAS])})`;
}

/**
 * Procedures, functions, and views that reference this object.
 * Unresolved references are included when the name matches. Names that appear
 * only inside dynamic SQL strings are not stored in sys.sql_expression_dependencies.
 */
export async function listCallingModules(
  db: HrmsDb,
  input: { schema: string; name: string },
): Promise<RelatedModuleList> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const name = assertSqlIdent(input.name.trim());
  if (isIgnoredSchema(schema)) {
    return { items: [], total: 0, truncated: false };
  }
  const rows = await db.$queryRaw<RelationSqlRow[]>`
    SELECT
        ReferencingSchema.name AS SchemaName,
        Referencing.name AS ObjectName,
        RTRIM(Referencing.type) AS TypeCode,
        CAST(1 AS int) AS Depth
    FROM sys.objects AS Target
    INNER JOIN sys.schemas AS TargetSchema
        ON TargetSchema.schema_id = Target.schema_id
    INNER JOIN sys.sql_expression_dependencies AS Dependencies
        ON Dependencies.referenced_id = Target.object_id
        OR (
            Dependencies.referenced_id IS NULL
            AND Dependencies.referenced_entity_name = Target.name
            AND (
                Dependencies.referenced_schema_name = TargetSchema.name
                OR Dependencies.referenced_schema_name IS NULL
            )
        )
    INNER JOIN sys.objects AS Referencing
        ON Referencing.object_id = Dependencies.referencing_id
    INNER JOIN sys.schemas AS ReferencingSchema
        ON ReferencingSchema.schema_id = Referencing.schema_id
    WHERE TargetSchema.name = ${schema}
        AND Target.name = ${name}
        AND Target.is_ms_shipped = 0
        AND Referencing.is_ms_shipped = 0
        AND Referencing.object_id <> Target.object_id
        AND ${moduleTypeSql(Prisma.raw("Referencing.type"))}
        AND ${visibleSchemaSql(Prisma.raw("ReferencingSchema.name"))}
  `;
  return shapeRelatedModules(rowsToModules(rows), { schema, name });
}

/**
 * Procedures, functions, and views this object references, then the modules
 * those reference, up to {@link NESTED_MODULE_DEPTH}. Cycles are skipped.
 */
export async function listNestedModules(
  db: HrmsDb,
  input: { schema: string; name: string },
): Promise<RelatedModuleList> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const name = assertSqlIdent(input.name.trim());
  if (isIgnoredSchema(schema)) {
    return { items: [], total: 0, truncated: false };
  }
  const depthLimit = Prisma.raw(String(NESTED_MODULE_DEPTH));
  const rows = await db.$queryRaw<RelationSqlRow[]>`
    WITH Walk AS (
        SELECT
            ReferencedSchema.name AS SchemaName,
            Referenced.name AS ObjectName,
            RTRIM(Referenced.type) AS TypeCode,
            1 AS Depth,
            CAST(
                N'>' + LOWER(ReferencedSchema.name) + N'.' + LOWER(Referenced.name) + N'>'
                AS nvarchar(4000)
            ) AS PathKey
        FROM sys.objects AS Source
        INNER JOIN sys.schemas AS SourceSchema
            ON SourceSchema.schema_id = Source.schema_id
        INNER JOIN sys.sql_expression_dependencies AS Dependencies
            ON Dependencies.referencing_id = Source.object_id
        INNER JOIN sys.objects AS Referenced
            ON Referenced.object_id = Dependencies.referenced_id
        INNER JOIN sys.schemas AS ReferencedSchema
            ON ReferencedSchema.schema_id = Referenced.schema_id
        WHERE SourceSchema.name = ${schema}
            AND Source.name = ${name}
            AND Referenced.is_ms_shipped = 0
            AND ${moduleTypeSql(Prisma.raw("Referenced.type"))}
            AND ${visibleSchemaSql(Prisma.raw("ReferencedSchema.name"))}
            AND NOT (
                ReferencedSchema.name = SourceSchema.name
                AND Referenced.name = Source.name
            )

        UNION ALL

        SELECT
            ChildSchema.name AS SchemaName,
            Child.name AS ObjectName,
            RTRIM(Child.type) AS TypeCode,
            Walk.Depth + 1 AS Depth,
            CAST(
                Walk.PathKey + LOWER(ChildSchema.name) + N'.' + LOWER(Child.name) + N'>'
                AS nvarchar(4000)
            ) AS PathKey
        FROM Walk
        INNER JOIN sys.objects AS Parent
            ON Parent.name = Walk.ObjectName
        INNER JOIN sys.schemas AS ParentSchema
            ON ParentSchema.schema_id = Parent.schema_id
            AND ParentSchema.name = Walk.SchemaName
        INNER JOIN sys.sql_expression_dependencies AS Dependencies
            ON Dependencies.referencing_id = Parent.object_id
        INNER JOIN sys.objects AS Child
            ON Child.object_id = Dependencies.referenced_id
        INNER JOIN sys.schemas AS ChildSchema
            ON ChildSchema.schema_id = Child.schema_id
        WHERE Walk.Depth < ${depthLimit}
            AND Parent.is_ms_shipped = 0
            AND Child.is_ms_shipped = 0
            AND ${moduleTypeSql(Prisma.raw("Child.type"))}
            AND ${visibleSchemaSql(Prisma.raw("ChildSchema.name"))}
            AND NOT (
                ChildSchema.name = ${schema}
                AND Child.name = ${name}
            )
            AND CHARINDEX(
                N'>' + LOWER(ChildSchema.name) + N'.' + LOWER(Child.name) + N'>',
                Walk.PathKey
            ) = 0
    )
    SELECT
        SchemaName,
        ObjectName,
        TypeCode,
        MIN(Depth) AS Depth
    FROM Walk
    GROUP BY SchemaName, ObjectName, TypeCode
    OPTION (MAXRECURSION ${depthLimit})
  `;
  return shapeRelatedModules(rowsToModules(rows), { schema, name });
}
