import oracledb from 'oracledb';

import {
  buildObjectId,
  normalizeDefinition,
  normalizeRoutineParameterMode,
} from './shared.js';
import type {
  CatalogQuery,
  DatabaseCatalog,
  DatabaseColumn,
  DatabaseMcpConfig,
  DatabaseObjectDetails,
  DatabaseObjectKind,
  DatabaseObjectSummary,
  DatabaseRelationship,
  DependencySummary,
  ObjectDetailsRequest,
  StoredProcedureInsight,
  StoredProcedureRequest,
} from '../types.js';

type OracleCatalogRow = {
  SCHEMA_NAME: string;
  OBJECT_NAME: string;
  OBJECT_TYPE: string;
};

type OracleColumnRow = {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH: number | null;
  DATA_PRECISION: number | null;
  DATA_SCALE: number | null;
  NULLABLE: string;
  IS_PRIMARY_KEY: number;
};

type OracleRelationshipRow = {
  RELATIONSHIP_NAME: string;
  FROM_SCHEMA: string;
  FROM_TABLE: string;
  FROM_COLUMN: string;
  TO_SCHEMA: string;
  TO_TABLE: string;
  TO_COLUMN: string;
};

type OracleDependencyRow = {
  SOURCE_SCHEMA?: string;
  SOURCE_NAME?: string;
  TARGET_SCHEMA?: string;
  TARGET_NAME?: string;
  SOURCE_TYPE?: string;
};

type OracleParameterRow = {
  POSITION: number;
  ARGUMENT_NAME: string | null;
  DATA_TYPE: string | null;
  IN_OUT: string | null;
};

type OracleSourceRow = {
  TEXT: string;
};

const ORACLE_OBJECT_TYPES = new Map<string, DatabaseObjectKind>([
  ['TABLE', 'table'],
  ['VIEW', 'view'],
  ['PROCEDURE', 'storedProcedure'],
  ['FUNCTION', 'function'],
  ['SEQUENCE', 'sequence'],
]);

const EXCLUDED_OWNERS = ['SYS', 'SYSTEM', 'XDB', 'CTXSYS', 'MDSYS', 'ORDSYS', 'WMSYS'];

export async function getOracleCatalog(
  config: DatabaseMcpConfig,
  query: CatalogQuery = {},
): Promise<DatabaseCatalog> {
  const connection = await connectOracle(config);

  try {
    const kinds = query.kinds ? new Set(query.kinds) : undefined;
    const schemaFilter = query.schema?.trim();
    const objectRows = ((await connection.execute(`
      SELECT owner AS schema_name, object_name, object_type
      FROM all_objects
      WHERE object_type IN ('TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION', 'SEQUENCE')
        AND owner NOT IN (${EXCLUDED_OWNERS.map((owner) => `'${owner}'`).join(', ')})
      ORDER BY owner, object_name
    `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleCatalogRow[];

    const objects: DatabaseObjectSummary[] = objectRows
      .map((row: OracleCatalogRow) => {
        const kind = ORACLE_OBJECT_TYPES.get(String(row.OBJECT_TYPE));
        return kind ? { row, kind } : null;
      })
      .filter((entry: { row: OracleCatalogRow; kind: DatabaseObjectKind } | null): entry is { row: OracleCatalogRow; kind: DatabaseObjectKind } => entry !== null)
      .filter(({ row, kind }: { row: OracleCatalogRow; kind: DatabaseObjectKind }) => matchesCatalogFilter(schemaFilter, kinds, String(row.SCHEMA_NAME), kind))
      .map(({ row, kind }: { row: OracleCatalogRow; kind: DatabaseObjectKind }) => createSummary(String(row.SCHEMA_NAME), String(row.OBJECT_NAME), kind, supportsDefinition(kind)));

    const visibleObjectIds = new Set(objects.map((object) => object.id));
    const relationships = query.includeRelationships
      ? await loadOracleCatalogRelationships(connection, visibleObjectIds)
      : [];

    return {
      engine: 'oracle',
      schemas: [...new Set(objects.map((object) => object.schema))],
      objects,
      relationships,
      warnings: [],
    };
  } finally {
    await connection.close().catch(() => undefined);
  }
}

export async function getOracleObjectDetails(
  config: DatabaseMcpConfig,
  request: ObjectDetailsRequest,
): Promise<DatabaseObjectDetails> {
  const connection = await connectOracle(config);

  try {
    await ensureOracleObjectExists(connection, request.schema, request.name, request.kind);

    if (request.kind === 'table' || request.kind === 'view') {
      const [columns, relationships, definition, dependencies, dependents] = await Promise.all([
        loadOracleColumns(connection, request.schema, request.name),
        loadOracleRelationships(connection, request.schema, request.name),
        request.kind === 'view' ? loadOracleViewDefinition(connection, request.schema, request.name) : Promise.resolve(undefined),
        request.kind === 'view' ? loadOracleDependencies(connection, request.schema, request.name, request.kind) : Promise.resolve([]),
        request.includeDependents ? loadOracleDependents(connection, request.schema, request.name, request.kind) : Promise.resolve([]),
      ]);

      return {
        object: createSummary(request.schema, request.name, request.kind, Boolean(definition)),
        columns,
        parameters: [],
        definition: definition ?? null,
        definitionUnavailableReason: request.kind === 'view' && !definition ? `Definition is unavailable for ${request.schema}.${request.name}.` : null,
        dependencies,
        dependents,
        relationships,
        warnings: [],
      };
    }

    if (request.kind === 'storedProcedure' || request.kind === 'function') {
      const [parameters, insight] = await Promise.all([
        loadOracleRoutineParameters(connection, request.schema, request.name),
        loadOracleRoutineInsight(connection, { schema: request.schema, name: request.name, includeDependents: request.includeDependents }, request.kind),
      ]);

      return {
        object: createSummary(request.schema, request.name, request.kind, Boolean(insight.script)),
        columns: [],
        parameters,
        definition: insight.script,
        definitionUnavailableReason: insight.scriptUnavailableReason,
        dependencies: insight.dependencies,
        dependents: insight.dependents,
        relationships: [],
        warnings: insight.warnings,
      };
    }

    return {
      object: createSummary(request.schema, request.name, request.kind, false),
      columns: [],
      parameters: [],
      definition: null,
      definitionUnavailableReason: null,
      dependencies: [],
      dependents: [],
      relationships: [],
      warnings: [],
    };
  } finally {
    await connection.close().catch(() => undefined);
  }
}

export async function getOracleStoredProcedureScript(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const connection = await connectOracle(config);

  try {
    await ensureOracleObjectExists(connection, request.schema, request.name, 'storedProcedure');
    return loadOracleRoutineInsight(connection, request, 'storedProcedure');
  } finally {
    await connection.close().catch(() => undefined);
  }
}

export async function getOracleStoredProcedureDependencies(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const connection = await connectOracle(config);

  try {
    await ensureOracleObjectExists(connection, request.schema, request.name, 'storedProcedure');
    return loadOracleRoutineInsight(connection, request, 'storedProcedure');
  } finally {
    await connection.close().catch(() => undefined);
  }
}

async function connectOracle(config: DatabaseMcpConfig) {
  return oracledb.getConnection({
    user: requireString(config.user, 'DB_MCP_USER'),
    password: requireString(config.password, 'DB_MCP_PASSWORD'),
    connectString: config.connectionString ?? `${requireString(config.host, 'DB_MCP_HOST')}:${config.port ?? 1521}/${requireString(config.database, 'DB_MCP_DATABASE')}`,
  });
}

async function loadOracleCatalogRelationships(connection: Awaited<ReturnType<typeof connectOracle>>, visibleObjectIds: Set<string>) {
  const rows = ((await connection.execute(`
    SELECT fk.constraint_name AS relationship_name,
      fk.owner AS from_schema,
      fk.table_name AS from_table,
      from_cols.column_name AS from_column,
      pk.owner AS to_schema,
      pk.table_name AS to_table,
      to_cols.column_name AS to_column
    FROM all_constraints fk
    INNER JOIN all_cons_columns from_cols
      ON from_cols.owner = fk.owner AND from_cols.constraint_name = fk.constraint_name
    INNER JOIN all_constraints pk
      ON pk.owner = fk.r_owner AND pk.constraint_name = fk.r_constraint_name
    INNER JOIN all_cons_columns to_cols
      ON to_cols.owner = pk.owner AND to_cols.constraint_name = pk.constraint_name AND to_cols.position = from_cols.position
    WHERE fk.constraint_type = 'R'
      AND fk.owner NOT IN (${EXCLUDED_OWNERS.map((owner) => `'${owner}'`).join(', ')})
    ORDER BY fk.owner, fk.table_name, fk.constraint_name, from_cols.position
  `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleRelationshipRow[];

  return rows
    .map((row: OracleRelationshipRow) => mapRelationshipRow(row))
    .filter((relationship: DatabaseRelationship) => visibleObjectIds.has(relationship.from.objectId) && visibleObjectIds.has(relationship.to.objectId));
}

async function ensureOracleObjectExists(
  connection: Awaited<ReturnType<typeof connectOracle>>,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<void> {
  const rows = ((await connection.execute(`
    SELECT object_type
    FROM all_objects
    WHERE owner = :schema AND object_name = :name AND object_type IN (${oracleKindToObjectTypes(kind).map((value) => `'${value}'`).join(', ')})
    FETCH FIRST 1 ROWS ONLY
  `, { schema, name }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as Array<{ OBJECT_TYPE: string }>;

  if (rows.length === 0) {
    throw new Error(`Unable to find ${kind} ${schema}.${name}.`);
  }
}

async function loadOracleColumns(connection: Awaited<ReturnType<typeof connectOracle>>, schema: string, name: string): Promise<DatabaseColumn[]> {
  const rows = ((await connection.execute(`
    SELECT c.column_name, c.data_type, c.data_length, c.data_precision, c.data_scale, c.nullable,
      CASE WHEN pk.column_name IS NULL THEN 0 ELSE 1 END AS is_primary_key
    FROM all_tab_columns c
    LEFT JOIN (
      SELECT acc.owner, acc.table_name, acc.column_name
      FROM all_constraints ac
      INNER JOIN all_cons_columns acc
        ON acc.owner = ac.owner AND acc.constraint_name = ac.constraint_name
      WHERE ac.constraint_type = 'P'
    ) pk
      ON pk.owner = c.owner AND pk.table_name = c.table_name AND pk.column_name = c.column_name
    WHERE c.owner = :schema AND c.table_name = :name
    ORDER BY c.column_id
  `, { schema, name }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleColumnRow[];

  return rows.map((row: OracleColumnRow) => ({
    name: String(row.COLUMN_NAME),
    dataType: formatOracleType(row),
    nullable: String(row.NULLABLE).toUpperCase() === 'Y',
    primaryKey: Boolean(row.IS_PRIMARY_KEY),
  }));
}

async function loadOracleRelationships(connection: Awaited<ReturnType<typeof connectOracle>>, schema: string, name: string) {
  const rows = ((await connection.execute(`
    SELECT fk.constraint_name AS relationship_name,
      fk.owner AS from_schema,
      fk.table_name AS from_table,
      from_cols.column_name AS from_column,
      pk.owner AS to_schema,
      pk.table_name AS to_table,
      to_cols.column_name AS to_column
    FROM all_constraints fk
    INNER JOIN all_cons_columns from_cols
      ON from_cols.owner = fk.owner AND from_cols.constraint_name = fk.constraint_name
    INNER JOIN all_constraints pk
      ON pk.owner = fk.r_owner AND pk.constraint_name = fk.r_constraint_name
    INNER JOIN all_cons_columns to_cols
      ON to_cols.owner = pk.owner AND to_cols.constraint_name = pk.constraint_name AND to_cols.position = from_cols.position
    WHERE fk.constraint_type = 'R'
      AND ((fk.owner = :schema AND fk.table_name = :name) OR (pk.owner = :schema AND pk.table_name = :name))
    ORDER BY fk.constraint_name, from_cols.position
  `, { schema, name }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleRelationshipRow[];

  return rows.map((row: OracleRelationshipRow) => mapRelationshipRow(row));
}

async function loadOracleViewDefinition(connection: Awaited<ReturnType<typeof connectOracle>>, schema: string, name: string) {
  const rows = ((await connection.execute(
    `SELECT text AS definition
     FROM all_views
     WHERE owner = :schema AND view_name = :name`,
    { schema, name },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  )).rows ?? []) as Array<{ DEFINITION?: string | null; definition?: string | null }>;
  return normalizeDefinition(rows[0]?.DEFINITION ?? rows[0]?.definition);
}

async function loadOracleDependencies(
  connection: Awaited<ReturnType<typeof connectOracle>>,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<DependencySummary[]> {
  const rows = ((await connection.execute(`
    SELECT owner AS source_schema, name AS source_name, type AS source_type,
      referenced_owner AS target_schema, referenced_name AS target_name
    FROM all_dependencies
    WHERE owner = :schema AND name = :name
      AND referenced_owner NOT IN (${EXCLUDED_OWNERS.map((owner) => `'${owner}'`).join(', ')})
  `, { schema, name }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleDependencyRow[];

  const operation = kind === 'storedProcedure' || kind === 'function' ? 'execute' : 'select';
  return dedupeDependencies(rows.map((row: OracleDependencyRow) => ({
    objectId: buildObjectId(String(row.TARGET_SCHEMA), String(row.TARGET_NAME)),
    operation,
  })));
}

async function loadOracleDependents(
  connection: Awaited<ReturnType<typeof connectOracle>>,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<DependencySummary[]> {
  const dependencyRows = ((await connection.execute(`
    SELECT owner AS source_schema, name AS source_name, type AS source_type
    FROM all_dependencies
    WHERE referenced_owner = :schema AND referenced_name = :name
      AND owner NOT IN (${EXCLUDED_OWNERS.map((owner) => `'${owner}'`).join(', ')})
  `, { schema, name }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleDependencyRow[];

  const fkDependents = kind === 'table'
    ? await loadOracleForeignKeyDependents(connection, schema, name)
    : [];

  return dedupeDependencies([
    ...dependencyRows.map((row: OracleDependencyRow) => ({
      objectId: buildObjectId(String(row.SOURCE_SCHEMA), String(row.SOURCE_NAME)),
      operation: String(row.SOURCE_TYPE).toUpperCase() === 'PROCEDURE' ? 'execute' as const : 'select' as const,
    })),
    ...fkDependents,
  ]);
}

async function loadOracleForeignKeyDependents(connection: Awaited<ReturnType<typeof connectOracle>>, schema: string, name: string): Promise<DependencySummary[]> {
  const rows = ((await connection.execute(`
    SELECT DISTINCT fk.owner AS schema_name, fk.table_name AS object_name
    FROM all_constraints fk
    INNER JOIN all_constraints pk
      ON pk.owner = fk.r_owner AND pk.constraint_name = fk.r_constraint_name
    WHERE fk.constraint_type = 'R' AND pk.owner = :schema AND pk.table_name = :name
  `, { schema, name }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as Array<{ SCHEMA_NAME: string; OBJECT_NAME: string }>;

  return rows.map((row: { SCHEMA_NAME: string; OBJECT_NAME: string }) => ({
    objectId: buildObjectId(String(row.SCHEMA_NAME), String(row.OBJECT_NAME)),
    operation: 'select' as const,
  }));
}

async function loadOracleRoutineParameters(connection: Awaited<ReturnType<typeof connectOracle>>, schema: string, name: string) {
  const rows = ((await connection.execute(`
    SELECT position, argument_name, data_type, in_out
    FROM all_arguments
    WHERE owner = :schema AND object_name = :name
      AND package_name IS NULL AND data_level = 0 AND position > 0
    ORDER BY overload, sequence
  `, { schema, name }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleParameterRow[];

  return rows.map((row: OracleParameterRow) => ({
    name: row.ARGUMENT_NAME ?? `ARG${row.POSITION}`,
    dataType: row.DATA_TYPE ?? 'VARCHAR2',
    mode: normalizeRoutineParameterMode(row.IN_OUT),
  }));
}

async function loadOracleRoutineInsight(
  connection: Awaited<ReturnType<typeof connectOracle>>,
  request: StoredProcedureRequest,
  kind: 'storedProcedure' | 'function',
): Promise<StoredProcedureInsight> {
  const [definition, dependencies, dependents] = await Promise.all([
    loadOracleRoutineDefinition(connection, request.schema, request.name, kind),
    loadOracleDependencies(connection, request.schema, request.name, kind),
    request.includeDependents ? loadOracleDependents(connection, request.schema, request.name, kind) : Promise.resolve([]),
  ]);

  return {
    schema: request.schema,
    name: request.name,
    script: definition ?? null,
    scriptUnavailableReason: definition ? null : `Definition is unavailable for ${request.schema}.${request.name}.`,
    dependencies,
    dependents,
    warnings: [],
  };
}

async function loadOracleRoutineDefinition(
  connection: Awaited<ReturnType<typeof connectOracle>>,
  schema: string,
  name: string,
  kind: 'storedProcedure' | 'function',
): Promise<string | undefined> {
  const rows = ((await connection.execute(`
    SELECT text
    FROM all_source
    WHERE owner = :schema AND name = :name AND type = :type
    ORDER BY line
  `, { schema, name, type: kind === 'storedProcedure' ? 'PROCEDURE' : 'FUNCTION' }, { outFormat: oracledb.OUT_FORMAT_OBJECT })).rows ?? []) as OracleSourceRow[];

  return normalizeDefinition(rows.map((row: OracleSourceRow) => row.TEXT).join(''));
}

function createSummary(schema: string, name: string, kind: DatabaseObjectKind, definitionAvailable: boolean): DatabaseObjectSummary {
  return {
    id: buildObjectId(schema, name),
    schema,
    name,
    kind,
    definitionAvailable,
    dependencySupport: 'partial',
  };
}

function mapRelationshipRow(row: OracleRelationshipRow): DatabaseRelationship {
  return {
    id: String(row.RELATIONSHIP_NAME),
    from: { objectId: buildObjectId(String(row.FROM_SCHEMA), String(row.FROM_TABLE)), column: String(row.FROM_COLUMN) },
    to: { objectId: buildObjectId(String(row.TO_SCHEMA), String(row.TO_TABLE)), column: String(row.TO_COLUMN) },
    label: `${row.FROM_TABLE}.${row.FROM_COLUMN} -> ${row.TO_TABLE}.${row.TO_COLUMN}`,
  };
}

function oracleKindToObjectTypes(kind: DatabaseObjectKind): string[] {
  if (kind === 'table') return ['TABLE'];
  if (kind === 'view') return ['VIEW'];
  if (kind === 'storedProcedure') return ['PROCEDURE'];
  if (kind === 'function') return ['FUNCTION'];
  if (kind === 'sequence') return ['SEQUENCE'];
  return [];
}

function formatOracleType(row: OracleColumnRow): string {
  const type = String(row.DATA_TYPE).toLowerCase();
  if (['varchar2', 'nvarchar2', 'char', 'nchar'].includes(type) && row.DATA_LENGTH != null) {
    return `${type}(${row.DATA_LENGTH})`;
  }
  if (type === 'number' && row.DATA_PRECISION != null) {
    return `${type}(${row.DATA_PRECISION}${row.DATA_SCALE != null ? `,${row.DATA_SCALE}` : ''})`;
  }
  return type;
}

function matchesCatalogFilter(
  schemaFilter: string | undefined,
  kinds: Set<DatabaseObjectKind> | undefined,
  schema: string,
  kind: DatabaseObjectKind,
): boolean {
  if (schemaFilter && schema !== schemaFilter) {
    return false;
  }

  return kinds ? kinds.has(kind) : true;
}

function dedupeDependencies(items: readonly DependencySummary[]): DependencySummary[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.objectId}:${item.operation}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function requireString(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function supportsDefinition(kind: DatabaseObjectKind): boolean {
  return kind === 'view' || kind === 'storedProcedure' || kind === 'function';
}