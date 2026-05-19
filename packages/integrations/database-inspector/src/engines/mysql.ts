import mysql from 'mysql2/promise';

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

type MySqlCatalogRow = {
  schema_name: string;
  object_name: string;
  object_kind: DatabaseObjectKind;
};

type MySqlColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: number | boolean;
  is_primary_key: number | boolean;
};

type MySqlRelationshipRow = {
  relationship_name: string;
  from_schema: string;
  from_table: string;
  from_column: string;
  to_schema: string;
  to_table: string;
  to_column: string;
};

type MySqlParameterRow = {
  ordinal_position: number;
  parameter_name: string;
  data_type: string;
  parameter_mode: string | null;
};

type MySqlDependencyRow = {
  source_schema?: string;
  source_name?: string;
  target_schema?: string;
  target_name?: string;
};

export async function getMySqlCatalog(
  config: DatabaseMcpConfig,
  query: CatalogQuery = {},
): Promise<DatabaseCatalog> {
  const connection = await createMySqlConnection(config);

  try {
    const kinds = query.kinds ? new Set(query.kinds) : undefined;
    const schemaFilter = query.schema?.trim();
    const [objectRowsResult] = await connection.query(`
      SELECT table_schema AS schema_name, table_name AS object_name,
        CASE WHEN table_type = 'VIEW' THEN 'view' ELSE 'table' END AS object_kind
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      UNION ALL
      SELECT routine_schema AS schema_name, routine_name AS object_name,
        CASE WHEN routine_type = 'PROCEDURE' THEN 'storedProcedure' ELSE 'function' END AS object_kind
      FROM information_schema.routines
      WHERE routine_schema = DATABASE()
      ORDER BY schema_name, object_name
    `);
    const objectRows = objectRowsResult as MySqlCatalogRow[];

    const objects: DatabaseObjectSummary[] = objectRows
      .filter((row: MySqlCatalogRow) => matchesCatalogFilter(schemaFilter, kinds, row.schema_name, row.object_kind))
      .map((row: MySqlCatalogRow) => createSummary(row.schema_name, row.object_name, row.object_kind, supportsDefinition(row.object_kind)));

    const visibleObjectIds = new Set(objects.map((object) => object.id));
    const relationships = query.includeRelationships
      ? await loadMySqlCatalogRelationships(connection, visibleObjectIds)
      : [];

    return {
      engine: 'mysql',
      schemas: [...new Set(objects.map((object) => object.schema))],
      objects,
      relationships,
      warnings: [],
    };
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function getMySqlObjectDetails(
  config: DatabaseMcpConfig,
  request: ObjectDetailsRequest,
): Promise<DatabaseObjectDetails> {
  const connection = await createMySqlConnection(config);

  try {
    await ensureMySqlObjectExists(connection, request.schema, request.name, request.kind);

    if (request.kind === 'table' || request.kind === 'view') {
      const [columns, relationships, definition, dependencies, dependents] = await Promise.all([
        loadMySqlColumns(connection, request.schema, request.name),
        loadMySqlRelationships(connection, request.schema, request.name),
        request.kind === 'view' ? loadMySqlViewDefinition(connection, request.schema, request.name) : Promise.resolve(undefined),
        request.kind === 'view' ? loadMySqlViewDependencies(connection, request.schema, request.name) : Promise.resolve([]),
        request.includeDependents ? loadMySqlTableDependents(connection, request.schema, request.name) : Promise.resolve([]),
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
      const insight = await loadMySqlRoutineInsight(connection, request);

      return {
        object: createSummary(request.schema, request.name, request.kind, Boolean(insight.script)),
        columns: [],
        parameters: await loadMySqlRoutineParameters(connection, request.schema, request.name),
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
    await connection.end().catch(() => undefined);
  }
}

export async function getMySqlStoredProcedureScript(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const connection = await createMySqlConnection(config);

  try {
    await ensureMySqlObjectExists(connection, request.schema, request.name, 'storedProcedure');
    return loadMySqlRoutineInsight(connection, request);
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function getMySqlStoredProcedureDependencies(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const connection = await createMySqlConnection(config);

  try {
    await ensureMySqlObjectExists(connection, request.schema, request.name, 'storedProcedure');
    return loadMySqlRoutineInsight(connection, request);
  } finally {
    await connection.end().catch(() => undefined);
  }
}

async function createMySqlConnection(config: DatabaseMcpConfig) {
  if (config.connectionString) {
    return mysql.createConnection(config.connectionString);
  }

  return mysql.createConnection({
    host: requireString(config.host, 'DB_MCP_HOST'),
    port: config.port ?? 3306,
    database: requireString(config.database, 'DB_MCP_DATABASE'),
    user: requireString(config.user, 'DB_MCP_USER'),
    password: requireString(config.password, 'DB_MCP_PASSWORD'),
    ssl: config.ssl ? {} : undefined,
  });
}

async function loadMySqlCatalogRelationships(connection: Awaited<ReturnType<typeof createMySqlConnection>>, visibleObjectIds: Set<string>) {
  const [rowsResult] = await connection.query(`
    SELECT constraint_name AS relationship_name,
      table_schema AS from_schema, table_name AS from_table, column_name AS from_column,
      referenced_table_schema AS to_schema, referenced_table_name AS to_table,
      referenced_column_name AS to_column
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE() AND referenced_table_name IS NOT NULL
    ORDER BY constraint_name, ordinal_position
  `);
  const rows = rowsResult as MySqlRelationshipRow[];

  return rows
    .map((row: MySqlRelationshipRow) => mapRelationshipRow(row))
    .filter((relationship: DatabaseRelationship) => visibleObjectIds.has(relationship.from.objectId) && visibleObjectIds.has(relationship.to.objectId));
}

async function ensureMySqlObjectExists(
  connection: Awaited<ReturnType<typeof createMySqlConnection>>,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<void> {
  const [rowsResult] = await connection.query(
    `SELECT object_kind
     FROM (
       SELECT table_schema AS schema_name, table_name AS object_name,
         CASE WHEN table_type = 'VIEW' THEN 'view' ELSE 'table' END AS object_kind
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       UNION ALL
       SELECT routine_schema AS schema_name, routine_name AS object_name,
         CASE WHEN routine_type = 'PROCEDURE' THEN 'storedProcedure' ELSE 'function' END AS object_kind
       FROM information_schema.routines
       WHERE routine_schema = DATABASE()
     ) AS objects
     WHERE schema_name = ? AND object_name = ? AND object_kind = ?
     LIMIT 1`,
    [schema, name, kind],
  );
  const rows = rowsResult as Array<{ object_kind: DatabaseObjectKind }>;

  if (rows.length === 0) {
    throw new Error(`Unable to find ${kind} ${schema}.${name}.`);
  }
}

async function loadMySqlColumns(connection: Awaited<ReturnType<typeof createMySqlConnection>>, schema: string, name: string): Promise<DatabaseColumn[]> {
  const [rowsResult] = await connection.query(
    `SELECT column_name, column_type AS data_type,
      is_nullable = 'YES' AS is_nullable, column_key = 'PRI' AS is_primary_key
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?
     ORDER BY ordinal_position`,
    [schema, name],
  );
  const rows = rowsResult as MySqlColumnRow[];

  return rows.map((row: MySqlColumnRow) => ({
    name: row.column_name,
    dataType: row.data_type,
    nullable: Boolean(row.is_nullable),
    primaryKey: Boolean(row.is_primary_key),
  }));
}

async function loadMySqlRelationships(connection: Awaited<ReturnType<typeof createMySqlConnection>>, schema: string, name: string) {
  const [rowsResult] = await connection.query(
    `SELECT constraint_name AS relationship_name,
      table_schema AS from_schema, table_name AS from_table, column_name AS from_column,
      referenced_table_schema AS to_schema, referenced_table_name AS to_table,
      referenced_column_name AS to_column
     FROM information_schema.key_column_usage
     WHERE referenced_table_name IS NOT NULL
       AND ((table_schema = ? AND table_name = ?) OR (referenced_table_schema = ? AND referenced_table_name = ?))
     ORDER BY constraint_name, ordinal_position`,
    [schema, name, schema, name],
  );
  const rows = rowsResult as MySqlRelationshipRow[];

  return rows.map((row: MySqlRelationshipRow) => mapRelationshipRow(row));
}

async function loadMySqlViewDefinition(connection: Awaited<ReturnType<typeof createMySqlConnection>>, schema: string, name: string) {
  const [rowsResult] = await connection.query(
    `SELECT view_definition AS definition
     FROM information_schema.views
     WHERE table_schema = ? AND table_name = ?
     LIMIT 1`,
    [schema, name],
  );
  const rows = rowsResult as Array<{ definition: string | null }>;

  return normalizeDefinition(rows[0]?.definition);
}

async function loadMySqlViewDependencies(connection: Awaited<ReturnType<typeof createMySqlConnection>>, schema: string, name: string): Promise<DependencySummary[]> {
  const [rowsResult] = await connection.query(
    `SELECT table_schema, table_name
     FROM information_schema.view_table_usage
     WHERE view_schema = ? AND view_name = ?`,
    [schema, name],
  );
  const rows = rowsResult as Array<{ table_schema: string; table_name: string }>;

  return dedupeDependencies(rows.map((row: { table_schema: string; table_name: string }) => ({
    objectId: buildObjectId(row.table_schema, row.table_name),
    operation: 'select' as const,
  })));
}

async function loadMySqlTableDependents(connection: Awaited<ReturnType<typeof createMySqlConnection>>, schema: string, name: string): Promise<DependencySummary[]> {
  const [rowsResult] = await connection.query(
    `SELECT view_schema AS source_schema, view_name AS source_name
     FROM information_schema.view_table_usage
     WHERE table_schema = ? AND table_name = ?`,
    [schema, name],
  );
  const rows = rowsResult as MySqlDependencyRow[];

  return dedupeDependencies(rows.map((row: MySqlDependencyRow) => ({
    objectId: buildObjectId(String(row.source_schema), String(row.source_name)),
    operation: 'select' as const,
  })));
}

async function loadMySqlRoutineParameters(connection: Awaited<ReturnType<typeof createMySqlConnection>>, schema: string, name: string) {
  const [rowsResult] = await connection.query(
    `SELECT p.ordinal_position,
      COALESCE(p.parameter_name, CONCAT('param', p.ordinal_position)) AS parameter_name,
      COALESCE(p.dtd_identifier, p.data_type) AS data_type,
      p.parameter_mode
     FROM information_schema.parameters AS p
     WHERE p.specific_schema = ? AND p.specific_name = ? AND p.ordinal_position > 0
     ORDER BY p.ordinal_position`,
    [schema, name],
  );
  const rows = rowsResult as MySqlParameterRow[];

  return rows.map((row: MySqlParameterRow) => ({
    name: row.parameter_name,
    dataType: row.data_type,
    mode: normalizeRoutineParameterMode(row.parameter_mode),
  }));
}

async function loadMySqlRoutineInsight(
  connection: Awaited<ReturnType<typeof createMySqlConnection>>,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const [rowsResult] = await connection.query(
    `SELECT routine_definition AS definition
     FROM information_schema.routines
     WHERE routine_schema = ? AND routine_name = ? AND routine_type = 'PROCEDURE'
     LIMIT 1`,
    [request.schema, request.name],
  );
  const rows = rowsResult as Array<{ definition: string | null }>;

  const script = normalizeDefinition(rows[0]?.definition) ?? null;
  const warnings = ['MySQL stored procedure dependency inspection is partial and currently does not resolve referenced objects.'];

  return {
    schema: request.schema,
    name: request.name,
    script,
    scriptUnavailableReason: script ? null : `Definition is unavailable for storedProcedure ${request.schema}.${request.name}.`,
    dependencies: [],
    dependents: [],
    warnings,
  };
}

function createSummary(
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
  definitionAvailable: boolean,
): DatabaseObjectSummary {
  return {
    id: buildObjectId(schema, name),
    schema,
    name,
    kind,
    definitionAvailable,
    dependencySupport: 'partial',
  };
}

function mapRelationshipRow(row: MySqlRelationshipRow): DatabaseRelationship {
  return {
    id: row.relationship_name,
    from: { objectId: buildObjectId(row.from_schema, row.from_table), column: row.from_column },
    to: { objectId: buildObjectId(row.to_schema, row.to_table), column: row.to_column },
    label: `${row.from_table}.${row.from_column} -> ${row.to_table}.${row.to_column}`,
  };
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