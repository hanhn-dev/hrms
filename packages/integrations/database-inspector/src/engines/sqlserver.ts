import sql from 'mssql';

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

type SqlServerObjectType = 'U' | 'V' | 'P' | 'FN' | 'IF' | 'TF' | 'SO';

type SqlServerCatalogRow = {
  schema_name: string;
  object_name: string;
  object_type: SqlServerObjectType;
};

type SqlServerColumnRow = {
  column_name: string;
  data_type: string;
  max_length: number | null;
  precision: number | null;
  scale: number | null;
  is_nullable: boolean | number;
  is_primary_key: boolean | number;
};

type SqlServerRelationshipRow = {
  relationship_name: string;
  from_schema: string;
  from_table: string;
  from_column: string;
  to_schema: string;
  to_table: string;
  to_column: string;
};

type SqlServerParameterRow = {
  parameter_name: string | null;
  parameter_id: number;
  data_type: string;
  max_length: number | null;
  precision: number | null;
  scale: number | null;
  is_output: boolean | number;
};

type SqlServerDefinitionRow = {
  definition?: string | null;
  module_definition?: string | null;
  is_encrypted?: boolean | number | string | null;
  has_view_definition?: boolean | number | string | null;
  has_sql_module?: boolean | number | string | null;
};

type SqlServerDependencyRow = {
  schema_name: string;
  object_name: string;
  object_type: string | null;
};

type SqlServerPool = any;

const SQL_SERVER_OBJECT_TYPES = new Map<SqlServerObjectType, DatabaseObjectKind>([
  ['U', 'table'],
  ['V', 'view'],
  ['P', 'storedProcedure'],
  ['FN', 'function'],
  ['IF', 'function'],
  ['TF', 'function'],
  ['SO', 'sequence'],
]);

export async function getSqlServerCatalog(
  config: DatabaseMcpConfig,
  query: CatalogQuery = {},
): Promise<DatabaseCatalog> {
  const pool = await connectSqlServer(config);

  try {
    const kinds = query.kinds ? new Set(query.kinds) : undefined;
    const schemaFilter = query.schema?.trim();
    const objectRows = (await pool.request().query(`
      SELECT s.name AS schema_name, o.name AS object_name, o.type AS object_type
      FROM sys.objects AS o
      INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
      WHERE o.is_ms_shipped = 0 AND o.type IN ('U', 'V', 'P', 'FN', 'IF', 'TF', 'SO')
      ORDER BY s.name, o.name
    `)).recordset as SqlServerCatalogRow[];

    const objects: DatabaseObjectSummary[] = objectRows
      .map((row: SqlServerCatalogRow) => {
        const kind = SQL_SERVER_OBJECT_TYPES.get(row.object_type);
        return kind ? { row, kind } : null;
      })
      .filter((entry: { row: SqlServerCatalogRow; kind: DatabaseObjectKind } | null): entry is { row: SqlServerCatalogRow; kind: DatabaseObjectKind } => entry !== null)
      .filter(({ row, kind }: { row: SqlServerCatalogRow; kind: DatabaseObjectKind }) => matchesCatalogFilter(schemaFilter, kinds, row.schema_name, kind))
      .map(({ row, kind }: { row: SqlServerCatalogRow; kind: DatabaseObjectKind }) => createSummary(row.schema_name, row.object_name, kind, supportsDefinition(kind)));

    const visibleObjectIds = new Set(objects.map((object) => object.id));
    const relationships = query.includeRelationships
      ? await loadSqlServerCatalogRelationships(pool, visibleObjectIds)
      : [];

    return {
      engine: 'sqlserver',
      schemas: [...new Set(objects.map((object) => object.schema))],
      objects,
      relationships,
      warnings: [],
    };
  } finally {
    await pool.close().catch(() => undefined);
  }
}

export async function getSqlServerObjectDetails(
  config: DatabaseMcpConfig,
  request: ObjectDetailsRequest,
): Promise<DatabaseObjectDetails> {
  const pool = await connectSqlServer(config);

  try {
    await ensureSqlServerObjectExists(pool, request.schema, request.name, request.kind);

    if (request.kind === 'table' || request.kind === 'view') {
      const [columns, relationships, definitionMeta, dependencies, dependents] = await Promise.all([
        loadSqlServerColumns(pool, request.schema, request.name),
        loadSqlServerRelationships(pool, request.schema, request.name),
        request.kind === 'view' ? loadSqlServerDefinitionMeta(pool, request.schema, request.name, request.kind) : Promise.resolve(undefined),
        request.kind === 'view' ? loadSqlServerDependencies(pool, request.schema, request.name, request.kind) : Promise.resolve([]),
        request.includeDependents ? loadSqlServerDependents(pool, request.schema, request.name, request.kind) : Promise.resolve([]),
      ]);

      return {
        object: createSummary(request.schema, request.name, request.kind, Boolean(definitionMeta?.definition)),
        columns,
        parameters: [],
        definition: definitionMeta?.definition ?? null,
        definitionUnavailableReason: definitionMeta?.definitionUnavailableReason ?? null,
        dependencies,
        dependents,
        relationships,
        warnings: [],
      };
    }

    if (request.kind === 'storedProcedure' || request.kind === 'function') {
      const [parameters, insight] = await Promise.all([
        loadSqlServerRoutineParameters(pool, request.schema, request.name),
        loadSqlServerRoutineInsight(pool, { schema: request.schema, name: request.name, includeDependents: request.includeDependents }, request.kind),
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
    await pool.close().catch(() => undefined);
  }
}

export async function getSqlServerStoredProcedureScript(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const pool = await connectSqlServer(config);

  try {
    await ensureSqlServerObjectExists(pool, request.schema, request.name, 'storedProcedure');
    return loadSqlServerRoutineInsight(pool, request, 'storedProcedure');
  } finally {
    await pool.close().catch(() => undefined);
  }
}

export async function getSqlServerStoredProcedureDependencies(
  config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): Promise<StoredProcedureInsight> {
  const pool = await connectSqlServer(config);

  try {
    await ensureSqlServerObjectExists(pool, request.schema, request.name, 'storedProcedure');
    return loadSqlServerRoutineInsight(pool, request, 'storedProcedure');
  } finally {
    await pool.close().catch(() => undefined);
  }
}

async function connectSqlServer(config: DatabaseMcpConfig): Promise<SqlServerPool> {
  const pool = new sql.ConnectionPool(
    config.connectionString
      ? config.connectionString
      : {
          server: requireString(config.host, 'DB_MCP_HOST'),
          port: config.port ?? 1433,
          database: requireString(config.database, 'DB_MCP_DATABASE'),
          user: requireString(config.user, 'DB_MCP_USER'),
          password: requireString(config.password, 'DB_MCP_PASSWORD'),
          options: {
            encrypt: config.ssl,
            trustServerCertificate: config.trustServerCertificate,
          },
        },
  );

  return pool.connect();
}

async function loadSqlServerCatalogRelationships(pool: SqlServerPool, visibleObjectIds: Set<string>): Promise<DatabaseRelationship[]> {
  const rows = (await pool.request().query(`
    SELECT fk.name AS relationship_name,
      from_schema.name AS from_schema, from_table.name AS from_table, from_column.name AS from_column,
      to_schema.name AS to_schema, to_table.name AS to_table, to_column.name AS to_column
    FROM sys.foreign_key_columns AS fkc
    INNER JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables AS from_table ON from_table.object_id = fkc.parent_object_id
    INNER JOIN sys.schemas AS from_schema ON from_schema.schema_id = from_table.schema_id
    INNER JOIN sys.columns AS from_column ON from_column.object_id = fkc.parent_object_id AND from_column.column_id = fkc.parent_column_id
    INNER JOIN sys.tables AS to_table ON to_table.object_id = fkc.referenced_object_id
    INNER JOIN sys.schemas AS to_schema ON to_schema.schema_id = to_table.schema_id
    INNER JOIN sys.columns AS to_column ON to_column.object_id = fkc.referenced_object_id AND to_column.column_id = fkc.referenced_column_id
    ORDER BY fk.name
  `)).recordset as SqlServerRelationshipRow[];

  return rows
    .map((row: SqlServerRelationshipRow) => mapRelationshipRow(row))
    .filter((relationship: DatabaseRelationship) => visibleObjectIds.has(relationship.from.objectId) && visibleObjectIds.has(relationship.to.objectId));
}

async function ensureSqlServerObjectExists(
  pool: SqlServerPool,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<void> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  request.input('kind', sql.NVarChar, databaseKindToSqlServerKind(kind));

  const rows = (await request.query(`
    SELECT TOP 1 o.type AS object_type
    FROM sys.objects AS o
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    WHERE s.name = @schema AND o.name = @name AND o.type IN (
      SELECT value FROM STRING_SPLIT(@kind, ',')
    )
  `)).recordset as Array<{ object_type: SqlServerObjectType }>;

  if (rows.length === 0) {
    throw new Error(`Unable to find ${kind} ${schema}.${name}.`);
  }
}

async function loadSqlServerColumns(pool: SqlServerPool, schema: string, name: string): Promise<DatabaseColumn[]> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT c.name AS column_name, TYPE_NAME(c.user_type_id) AS data_type,
      c.max_length, c.precision, c.scale, c.is_nullable,
      CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS is_primary_key
    FROM sys.objects AS o
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    INNER JOIN sys.columns AS c ON c.object_id = o.object_id
    LEFT JOIN (
      SELECT ic.object_id, ic.column_id
      FROM sys.indexes AS i
      INNER JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      WHERE i.is_primary_key = 1
    ) AS pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
    WHERE s.name = @schema AND o.name = @name
    ORDER BY c.column_id
  `)).recordset as SqlServerColumnRow[];

  return rows.map((row: SqlServerColumnRow) => ({
    name: row.column_name,
    dataType: formatSqlServerType(row),
    nullable: Boolean(row.is_nullable),
    primaryKey: Boolean(row.is_primary_key),
  }));
}

async function loadSqlServerRelationships(pool: SqlServerPool, schema: string, name: string): Promise<DatabaseRelationship[]> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT fk.name AS relationship_name,
      from_schema.name AS from_schema, from_table.name AS from_table, from_column.name AS from_column,
      to_schema.name AS to_schema, to_table.name AS to_table, to_column.name AS to_column
    FROM sys.foreign_key_columns AS fkc
    INNER JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.tables AS from_table ON from_table.object_id = fkc.parent_object_id
    INNER JOIN sys.schemas AS from_schema ON from_schema.schema_id = from_table.schema_id
    INNER JOIN sys.columns AS from_column ON from_column.object_id = fkc.parent_object_id AND from_column.column_id = fkc.parent_column_id
    INNER JOIN sys.tables AS to_table ON to_table.object_id = fkc.referenced_object_id
    INNER JOIN sys.schemas AS to_schema ON to_schema.schema_id = to_table.schema_id
    INNER JOIN sys.columns AS to_column ON to_column.object_id = fkc.referenced_object_id AND to_column.column_id = fkc.referenced_column_id
    WHERE (from_schema.name = @schema AND from_table.name = @name)
       OR (to_schema.name = @schema AND to_table.name = @name)
    ORDER BY fk.name
  `)).recordset as SqlServerRelationshipRow[];

  return rows.map((row: SqlServerRelationshipRow) => mapRelationshipRow(row));
}

async function loadSqlServerDefinitionMeta(
  pool: SqlServerPool,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<{ definition?: string; definitionUnavailableReason?: string } | undefined> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT
      OBJECT_DEFINITION(o.object_id) AS definition,
      m.definition AS module_definition,
      CAST(OBJECTPROPERTYEX(o.object_id, 'IsEncrypted') AS int) AS is_encrypted,
      HAS_PERMS_BY_NAME(QUOTENAME(s.name) + N'.' + QUOTENAME(o.name), N'OBJECT', N'VIEW DEFINITION') AS has_view_definition,
      CASE WHEN m.object_id IS NULL THEN 0 ELSE 1 END AS has_sql_module
    FROM sys.objects AS o
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    LEFT JOIN sys.sql_modules AS m ON m.object_id = o.object_id
    WHERE s.name = @schema AND o.name = @name
  `)).recordset as SqlServerDefinitionRow[];

  return resolveSqlServerDefinitionMetadata(rows[0], schema, name, kind);
}

async function loadSqlServerDependencies(
  pool: SqlServerPool,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<DependencySummary[]> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT DISTINCT
      COALESCE(referenced_schema.name, d.referenced_schema_name, referencing_schema.name) AS schema_name,
      COALESCE(referenced.name, d.referenced_entity_name) AS object_name,
      referenced.type AS object_type
    FROM sys.sql_expression_dependencies AS d
    INNER JOIN sys.objects AS referencing ON referencing.object_id = d.referencing_id
    INNER JOIN sys.schemas AS referencing_schema ON referencing_schema.schema_id = referencing.schema_id
    LEFT JOIN sys.objects AS referenced ON referenced.object_id = d.referenced_id
    LEFT JOIN sys.schemas AS referenced_schema ON referenced_schema.schema_id = referenced.schema_id
    WHERE referencing_schema.name = @schema AND referencing.name = @name
      AND COALESCE(referenced.name, d.referenced_entity_name) IS NOT NULL
  `)).recordset as SqlServerDependencyRow[];

  const operation = kind === 'storedProcedure' || kind === 'function' ? 'execute' : 'select';
  return dedupeDependencies(
    rows.map((row: SqlServerDependencyRow) => ({
      objectId: buildObjectId(row.schema_name, row.object_name),
      operation,
    })),
  );
}

async function loadSqlServerDependents(
  pool: SqlServerPool,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): Promise<DependencySummary[]> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT DISTINCT
      referencing_schema.name AS schema_name,
      referencing.name AS object_name,
      referencing.type AS object_type
    FROM sys.sql_expression_dependencies AS d
    INNER JOIN sys.objects AS referencing ON referencing.object_id = d.referencing_id
    INNER JOIN sys.schemas AS referencing_schema ON referencing_schema.schema_id = referencing.schema_id
    LEFT JOIN sys.objects AS referenced ON referenced.object_id = d.referenced_id
    LEFT JOIN sys.schemas AS referenced_schema ON referenced_schema.schema_id = referenced.schema_id
    WHERE (
      (referenced_schema.name = @schema AND referenced.name = @name)
      OR (d.referenced_schema_name = @schema AND d.referenced_entity_name = @name)
      OR (d.referenced_schema_name IS NULL AND d.referenced_entity_name = @name)
    )
  `)).recordset as SqlServerDependencyRow[];

  const foreignKeyDependents = kind === 'table'
    ? await loadSqlServerForeignKeyDependents(pool, schema, name)
    : [];

  return dedupeDependencies([
    ...rows.map((row: SqlServerDependencyRow) => ({
      objectId: buildObjectId(row.schema_name, row.object_name),
      operation: sqlServerTypeToOperation(row.object_type),
    })),
    ...foreignKeyDependents,
  ]);
}

async function loadSqlServerForeignKeyDependents(pool: SqlServerPool, schema: string, name: string): Promise<DependencySummary[]> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT DISTINCT from_schema.name AS schema_name, from_table.name AS object_name
    FROM sys.foreign_key_columns AS fkc
    INNER JOIN sys.tables AS from_table ON from_table.object_id = fkc.parent_object_id
    INNER JOIN sys.schemas AS from_schema ON from_schema.schema_id = from_table.schema_id
    INNER JOIN sys.tables AS to_table ON to_table.object_id = fkc.referenced_object_id
    INNER JOIN sys.schemas AS to_schema ON to_schema.schema_id = to_table.schema_id
    WHERE to_schema.name = @schema AND to_table.name = @name
  `)).recordset as Array<{ schema_name: string; object_name: string }>;

  return rows.map((row: { schema_name: string; object_name: string }) => ({
    objectId: buildObjectId(row.schema_name, row.object_name),
    operation: 'select' as const,
  }));
}

async function loadSqlServerRoutineParameters(pool: SqlServerPool, schema: string, name: string) {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT p.name AS parameter_name, p.parameter_id, TYPE_NAME(p.user_type_id) AS data_type,
      p.max_length, p.precision, p.scale, p.is_output
    FROM sys.objects AS o
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    INNER JOIN sys.parameters AS p ON p.object_id = o.object_id
    WHERE s.name = @schema AND o.name = @name AND p.parameter_id > 0
    ORDER BY p.parameter_id
  `)).recordset as SqlServerParameterRow[];

  return rows.map((row: SqlServerParameterRow) => ({
    name: row.parameter_name ?? `@param${row.parameter_id}`,
    dataType: formatSqlServerType(row),
    mode: Boolean(row.is_output) ? 'out' : normalizeRoutineParameterMode('in'),
  }));
}

async function loadSqlServerRoutineInsight(
  pool: SqlServerPool,
  request: StoredProcedureRequest,
  kind: 'storedProcedure' | 'function',
): Promise<StoredProcedureInsight> {
  const [definitionMeta, dependencies, dependents] = await Promise.all([
    loadSqlServerDefinitionMeta(pool, request.schema, request.name, kind),
    loadSqlServerDependencies(pool, request.schema, request.name, kind),
    request.includeDependents ? loadSqlServerDependents(pool, request.schema, request.name, kind) : Promise.resolve([]),
  ]);

  return {
    schema: request.schema,
    name: request.name,
    script: definitionMeta?.definition ?? null,
    scriptUnavailableReason: definitionMeta?.definitionUnavailableReason ?? null,
    dependencies,
    dependents,
    warnings: [],
  };
}

function resolveSqlServerDefinitionMetadata(
  row: SqlServerDefinitionRow | undefined,
  schema: string,
  name: string,
  kind: DatabaseObjectKind,
): { definition?: string; definitionUnavailableReason?: string } {
  const definition = normalizeDefinition(row?.module_definition ?? row?.definition);
  if (definition) {
    return { definition };
  }

  if (!supportsDefinition(kind)) {
    return {};
  }

  if (!row) {
    return { definitionUnavailableReason: `Unable to find ${kind} ${schema}.${name}.` };
  }

  if (toSqlServerBoolean(row.is_encrypted) === true) {
    return { definitionUnavailableReason: `${schema}.${name} was created WITH ENCRYPTION, so SQL Server does not expose its script text.` };
  }

  if (toSqlServerBoolean(row.has_view_definition) === false) {
    return { definitionUnavailableReason: `The current login does not have VIEW DEFINITION permission on ${schema}.${name}.` };
  }

  if (toSqlServerBoolean(row.has_sql_module) === false) {
    return { definitionUnavailableReason: `SQL Server found ${schema}.${name}, but it does not have a SQL module definition row.` };
  }

  return { definitionUnavailableReason: `Definition is unavailable for ${schema}.${name}.` };
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

function mapRelationshipRow(row: SqlServerRelationshipRow): DatabaseRelationship {
  return {
    id: row.relationship_name,
    from: { objectId: buildObjectId(row.from_schema, row.from_table), column: row.from_column },
    to: { objectId: buildObjectId(row.to_schema, row.to_table), column: row.to_column },
    label: `${row.from_table}.${row.from_column} -> ${row.to_table}.${row.to_column}`,
  };
}

function databaseKindToSqlServerKind(kind: DatabaseObjectKind): string {
  if (kind === 'table') return 'U';
  if (kind === 'view') return 'V';
  if (kind === 'storedProcedure') return 'P';
  if (kind === 'function') return 'FN,IF,TF';
  if (kind === 'sequence') return 'SO';
  return '';
}

function formatSqlServerType(row: { data_type: string; max_length?: number | null; precision?: number | null; scale?: number | null }): string {
  const type = row.data_type.toLowerCase();
  if (['varchar', 'nvarchar', 'char', 'nchar', 'binary', 'varbinary'].includes(type) && row.max_length != null) {
    return `${type}(${row.max_length === -1 ? 'max' : row.max_length})`;
  }
  if (['decimal', 'numeric'].includes(type) && row.precision != null) {
    return `${type}(${row.precision}${row.scale != null ? `,${row.scale}` : ''})`;
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

function toSqlServerBoolean(value: boolean | number | string | null | undefined): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim() !== '0';
  }
  return null;
}

function sqlServerTypeToOperation(type: string | null): DependencySummary['operation'] {
  return type === 'P' || type === 'FN' || type === 'IF' || type === 'TF' ? 'execute' : 'select';
}