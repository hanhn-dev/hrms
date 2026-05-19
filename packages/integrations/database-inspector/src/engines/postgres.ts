import { Client as PgClient } from 'pg';

import {
  asNumber,
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

type PostgresCatalogRow = {
  schema_name: string;
  object_name: string;
  object_kind: DatabaseObjectKind;
};

type PostgresColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
};

type PostgresRelationshipRow = {
  relationship_name: string;
  from_schema: string;
  from_table: string;
  from_column: string;
  to_schema: string;
  to_table: string;
  to_column: string;
};

type PostgresDependencyRow = {
  source_schema: string;
  source_name: string;
  target_schema: string;
  target_name: string;
  operation?: 'select' | 'execute';
};

type PostgresParameterRow = {
  ordinal_position: number;
  parameter_name: string;
  data_type: string;
  parameter_mode: string | null;
};

type PostgresClient = any;

export async function getPostgresCatalog(
  config: DatabaseMcpConfig,
  query: CatalogQuery = {},
): Promise<DatabaseCatalog> {
  const client = createPostgresClient(config);
  await client.connect();

  try {
    const kinds = query.kinds ? new Set(query.kinds) : undefined;
    const schemaFilter = query.schema?.trim();
    const objectRows = ((await client.query(`
      SELECT n.nspname AS schema_name, c.relname AS object_name,
        CASE
          WHEN c.relkind IN ('r', 'p') THEN 'table'
          WHEN c.relkind IN ('v', 'm') THEN 'view'
          WHEN c.relkind = 'S' THEN 'sequence'
        END AS object_kind
      FROM pg_class AS c
      INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p', 'v', 'm', 'S')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      UNION ALL
      SELECT n.nspname AS schema_name, p.proname AS object_name,
        CASE WHEN p.prokind = 'p' THEN 'storedProcedure' ELSE 'function' END AS object_kind
      FROM pg_proc AS p
      INNER JOIN pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND p.prokind IN ('p', 'f')
      ORDER BY schema_name, object_name
    `)).rows ?? []) as PostgresCatalogRow[];

    const objects: DatabaseObjectSummary[] = objectRows
      .filter((row: PostgresCatalogRow) => matchesCatalogFilter(schemaFilter, kinds, row.schema_name, row.object_kind))
      .map((row: PostgresCatalogRow) => createSummary(row.schema_name, row.object_name, row.object_kind, supportsDefinition(row.object_kind)));

    const visibleObjectIds = new Set(objects.map((object) => object.id));
    const relationships = query.includeRelationships
      ? await loadPostgresCatalogRelationships(client, visibleObjectIds)
      : [];

    return {
      engine: 'postgres',
      schemas: [...new Set(objects.map((object) => object.schema))],
      objects,
      relationships,
      warnings: [],
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function getPostgresObjectDetails(
  config: DatabaseMcpConfig,
  request: ObjectDetailsRequest,
): Promise<DatabaseObjectDetails> {
  const client = createPostgresClient(config);
  await client.connect();

  try {
    await ensurePostgresObjectExists(client, request.schema, request.name, request.kind);

    if (request.kind === 'table' || request.kind === 'view') {
      const [columnsRows, relationshipRows, definition, dependencies, dependents] = await Promise.all([
        loadPostgresColumns(client, request.schema, request.name),
        loadPostgresRelationships(client, request.schema, request.name),
        request.kind === 'view' ? loadPostgresViewDefinition(client, request.schema, request.name) : Promise.resolve(undefined),
        request.kind === 'view' ? loadPostgresViewDependencies(client, request.schema, request.name) : Promise.resolve([]),
        request.includeDependents ? loadPostgresTableDependents(client, request.schema, request.name) : Promise.resolve([]),
      ]);

      return {
        object: createSummary(request.schema, request.name, request.kind, Boolean(definition)),
        columns: columnsRows,
        parameters: [],
        definition: definition ?? null,
        definitionUnavailableReason: request.kind === 'view' && !definition ? `Definition is unavailable for ${request.schema}.${request.name}.` : null,
        dependencies,
        dependents,
        relationships: relationshipRows,
        warnings: [],
      };
    }

    if (request.kind === 'storedProcedure' || request.kind === 'function') {
      const insight = await loadPostgresRoutineInsight(client, {
        schema: request.schema,
        name: request.name,
        includeDependents: request.includeDependents,
      });

      return {
        object: createSummary(request.schema, request.name, request.kind, Boolean(insight.script)),
        columns: [],
        parameters: await loadPostgresRoutineParameters(client, request.schema, request.name),
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
    await client.end().catch(() => undefined);
  }
}

export async function getPostgresStoredProcedureScript(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const client = createPostgresClient(config);
  await client.connect();

  try {
    await ensurePostgresObjectExists(client, request.schema, request.name, 'storedProcedure');
    return loadPostgresRoutineInsight(client, request);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function getPostgresStoredProcedureDependencies(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const client = createPostgresClient(config);
  await client.connect();

  try {
    await ensurePostgresObjectExists(client, request.schema, request.name, 'storedProcedure');
    return loadPostgresRoutineInsight(client, request);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function createPostgresClient(config: DatabaseMcpConfig): PostgresClient {
  return new PgClient(
    config.connectionString
      ? { connectionString: config.connectionString, ssl: config.ssl ? { rejectUnauthorized: false } : undefined }
      : {
          host: requireString(config.host, 'DB_MCP_HOST'),
          port: config.port ?? asNumber('5432') ?? 5432,
          database: requireString(config.database, 'DB_MCP_DATABASE'),
          user: requireString(config.user, 'DB_MCP_USER'),
          password: requireString(config.password, 'DB_MCP_PASSWORD'),
          ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        },
  );
}

async function loadPostgresCatalogRelationships(client: PostgresClient, visibleObjectIds: Set<string>): Promise<DatabaseRelationship[]> {
  const rows = ((await client.query(`
    SELECT tc.constraint_name AS relationship_name,
      kcu.table_schema AS from_schema, kcu.table_name AS from_table, kcu.column_name AS from_column,
      ccu.table_schema AS to_schema, ccu.table_name AS to_table, ccu.column_name AS to_column
    FROM information_schema.table_constraints AS tc
    INNER JOIN information_schema.key_column_usage AS kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
    INNER JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.constraint_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `)).rows ?? []) as PostgresRelationshipRow[];

  return rows
    .map((row: PostgresRelationshipRow) => mapRelationshipRow(row))
    .filter((relationship: DatabaseRelationship) => visibleObjectIds.has(relationship.from.objectId) && visibleObjectIds.has(relationship.to.objectId));
}

async function ensurePostgresObjectExists(
  client: PostgresClient,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<void> {
  const rows = ((await client.query(`
    SELECT object_kind
    FROM (
      SELECT n.nspname AS schema_name, c.relname AS object_name,
        CASE
          WHEN c.relkind IN ('r', 'p') THEN 'table'
          WHEN c.relkind IN ('v', 'm') THEN 'view'
          WHEN c.relkind = 'S' THEN 'sequence'
        END AS object_kind
      FROM pg_class AS c
      INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p', 'v', 'm', 'S')
      UNION ALL
      SELECT n.nspname AS schema_name, p.proname AS object_name,
        CASE WHEN p.prokind = 'p' THEN 'storedProcedure' ELSE 'function' END AS object_kind
      FROM pg_proc AS p
      INNER JOIN pg_namespace AS n ON n.oid = p.pronamespace
      WHERE p.prokind IN ('p', 'f')
    ) AS objects
    WHERE schema_name = $1 AND object_name = $2 AND object_kind = $3
    LIMIT 1
  `, [schema, name, kind])).rows ?? []) as Array<{ object_kind: DatabaseObjectKind }>;

  if (rows.length === 0) {
    throw new Error(`Unable to find ${kind} ${schema}.${name}.`);
  }
}

async function loadPostgresColumns(client: PostgresClient, schema: string, name: string): Promise<DatabaseColumn[]> {
  const rows = ((await client.query(`
    SELECT a.attname AS column_name,
      format_type(a.atttypid, a.atttypmod) AS data_type,
      NOT a.attnotnull AS is_nullable,
      EXISTS (
        SELECT 1 FROM pg_index AS i
        WHERE i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY(i.indkey)
      ) AS is_primary_key
    FROM pg_class AS c
    INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
    INNER JOIN pg_attribute AS a ON a.attrelid = c.oid
    WHERE n.nspname = $1 AND c.relname = $2
      AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum
  `, [schema, name])).rows ?? []) as PostgresColumnRow[];

  return rows.map((row: PostgresColumnRow) => ({
    name: row.column_name,
    dataType: row.data_type,
    nullable: Boolean(row.is_nullable),
    primaryKey: Boolean(row.is_primary_key),
  }));
}

async function loadPostgresRelationships(client: PostgresClient, schema: string, name: string): Promise<DatabaseRelationship[]> {
  const rows = ((await client.query(`
    SELECT tc.constraint_name AS relationship_name,
      kcu.table_schema AS from_schema, kcu.table_name AS from_table, kcu.column_name AS from_column,
      ccu.table_schema AS to_schema, ccu.table_name AS to_table, ccu.column_name AS to_column
    FROM information_schema.table_constraints AS tc
    INNER JOIN information_schema.key_column_usage AS kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
    INNER JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (
        (kcu.table_schema = $1 AND kcu.table_name = $2)
        OR (ccu.table_schema = $1 AND ccu.table_name = $2)
      )
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `, [schema, name])).rows ?? []) as PostgresRelationshipRow[];

  return rows.map((row: PostgresRelationshipRow) => mapRelationshipRow(row));
}

async function loadPostgresViewDefinition(client: PostgresClient, schema: string, name: string): Promise<string | undefined> {
  const rows = ((await client.query(`
    SELECT pg_get_viewdef(c.oid, true) AS definition
    FROM pg_class AS c
    INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ('v', 'm')
    LIMIT 1
  `, [schema, name])).rows ?? []) as Array<{ definition: string }>;

  return normalizeDefinition(rows[0]?.definition);
}

async function loadPostgresViewDependencies(client: PostgresClient, schema: string, name: string): Promise<DependencySummary[]> {
  const rows = ((await client.query(`
    SELECT table_schema AS target_schema, table_name AS target_name
    FROM information_schema.view_table_usage
    WHERE view_schema = $1 AND view_name = $2
  `, [schema, name])).rows ?? []) as PostgresDependencyRow[];

  return dedupeDependencies(rows.map((row: PostgresDependencyRow) => ({
    objectId: buildObjectId(row.target_schema, row.target_name),
    operation: 'select' as const,
  })));
}

async function loadPostgresTableDependents(client: PostgresClient, schema: string, name: string): Promise<DependencySummary[]> {
  const [viewRowsResult, routineRowsResult] = await Promise.all([
    client.query(`
      SELECT view_schema AS source_schema, view_name AS source_name
      FROM information_schema.view_table_usage
      WHERE table_schema = $1 AND table_name = $2
    `, [schema, name]),
    client.query(`
      SELECT routine_schema AS source_schema, routine_name AS source_name
      FROM information_schema.routine_table_usage
      WHERE table_schema = $1 AND table_name = $2
    `, [schema, name]),
  ]);
  const viewRows = (viewRowsResult.rows ?? []) as Array<{ source_schema: string; source_name: string }>;
  const routineRows = (routineRowsResult.rows ?? []) as Array<{ source_schema: string; source_name: string }>;

  return dedupeDependencies([
    ...viewRows.map((row: { source_schema: string; source_name: string }) => ({ objectId: buildObjectId(row.source_schema, row.source_name), operation: 'select' as const })),
    ...routineRows.map((row: { source_schema: string; source_name: string }) => ({ objectId: buildObjectId(row.source_schema, row.source_name), operation: 'execute' as const })),
  ]);
}

async function loadPostgresRoutineParameters(client: PostgresClient, schema: string, name: string) {
  const rows = ((await client.query(`
    SELECT p.ordinal_position,
      COALESCE(p.parameter_name, '$' || p.ordinal_position::text) AS parameter_name,
      p.data_type,
      p.parameter_mode
    FROM information_schema.routines AS r
    INNER JOIN information_schema.parameters AS p
      ON p.specific_schema = r.specific_schema AND p.specific_name = r.specific_name
    WHERE r.routine_schema = $1 AND r.routine_name = $2
    ORDER BY p.ordinal_position
  `, [schema, name])).rows ?? []) as PostgresParameterRow[];

  return rows.map((row: PostgresParameterRow) => ({
    name: row.parameter_name,
    dataType: row.data_type,
    mode: normalizeRoutineParameterMode(row.parameter_mode),
  }));
}

async function loadPostgresRoutineInsight(client: PostgresClient, request: StoredProcedureRequest): Promise<StoredProcedureInsight> {
  const [definitionResult, tableDepsResult, routineDepsResult, dependentsResult] = await Promise.all([
    client.query(`
      SELECT pg_get_functiondef(p.oid) AS definition
      FROM pg_proc AS p
      INNER JOIN pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname = $1 AND p.proname = $2 AND p.prokind = 'p'
      LIMIT 1
    `, [request.schema, request.name]),
    client.query(`
      SELECT rn.nspname AS target_schema, c.relname AS target_name
      FROM pg_depend AS d
      INNER JOIN pg_proc AS p ON p.oid = d.objid
      INNER JOIN pg_namespace AS pn ON pn.oid = p.pronamespace
      INNER JOIN pg_class AS c ON c.oid = d.refobjid
      INNER JOIN pg_namespace AS rn ON rn.oid = c.relnamespace
      WHERE d.classid = 'pg_proc'::regclass
        AND d.refclassid = 'pg_class'::regclass
        AND pn.nspname = $1 AND p.proname = $2
        AND p.prokind = 'p'
        AND rn.nspname NOT IN ('pg_catalog', 'information_schema')
    `, [request.schema, request.name]),
    client.query(`
      SELECT r.routine_schema AS target_schema, r.routine_name AS target_name
      FROM information_schema.routine_routine_usage AS r
      WHERE r.specific_schema = $1 AND r.specific_name IN (
        SELECT specific_name
        FROM information_schema.routines
        WHERE routine_schema = $1 AND routine_name = $2 AND routine_type = 'PROCEDURE'
      )
    `, [request.schema, request.name]),
    request.includeDependents
      ? client.query(`
          SELECT routine_schema AS source_schema, routine_name AS source_name
          FROM information_schema.routine_routine_usage
          WHERE routine_schema <> ''
            AND specific_schema NOT IN ('pg_catalog', 'information_schema')
            AND routine_name <> ''
            AND specific_schema IN (
              SELECT specific_schema
              FROM information_schema.routines
              WHERE routine_schema = $1 AND routine_name = $2 AND routine_type = 'PROCEDURE'
            )
        `, [request.schema, request.name])
      : Promise.resolve({ rows: [] as PostgresDependencyRow[] }),
  ]);
  const definitionRows = (definitionResult.rows ?? []) as Array<{ definition: string }>;
  const tableDepsRows = (tableDepsResult.rows ?? []) as PostgresDependencyRow[];
  const routineDepsRows = (routineDepsResult.rows ?? []) as PostgresDependencyRow[];
  const dependentRows = (dependentsResult.rows ?? []) as PostgresDependencyRow[];

  return {
    schema: request.schema,
    name: request.name,
    script: normalizeDefinition(definitionRows[0]?.definition) ?? null,
    scriptUnavailableReason: definitionRows.length === 0 ? `Unable to find storedProcedure ${request.schema}.${request.name}.` : null,
    dependencies: dedupeDependencies([
      ...tableDepsRows.map((row: PostgresDependencyRow) => ({ objectId: buildObjectId(row.target_schema, row.target_name), operation: 'execute' as const })),
      ...routineDepsRows.map((row: PostgresDependencyRow) => ({ objectId: buildObjectId(row.target_schema, row.target_name), operation: 'execute' as const })),
    ]),
    dependents: request.includeDependents
      ? dedupeDependencies(dependentRows.map((row: PostgresDependencyRow) => ({ objectId: buildObjectId(row.source_schema, row.source_name), operation: 'execute' as const })))
      : [],
    warnings: [],
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

function mapRelationshipRow(row: PostgresRelationshipRow): DatabaseRelationship {
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