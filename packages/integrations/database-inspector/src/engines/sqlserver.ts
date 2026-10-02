import sql from 'mssql';

import {
  assertSqlIdentifier,
  buildNamedExecSql,
  mapPayloadToProcedureParameters,
  normalizeParameterName,
  parseProcedurePayload,
  quoteSqlIdentifier,
  type PayloadMappingResult,
} from '../payload-to-parameters.js';
import type {
  CatalogQuery,
  DatabaseCatalog,
  DatabaseColumn,
  DatabaseConstraint,
  DatabaseConstraintKind,
  DatabaseIndex,
  DatabaseMcpConfig,
  DatabaseObjectDetails,
  DatabaseObjectKind,
  DatabaseObjectSummary,
  DatabaseRelationship,
  DatabaseTrigger,
  DependencySummary,
  ExecuteStoredProcedureRequest,
  ObjectDetailsRequest,
  ProcedureParameterDescriptor,
  StoredProcedureExecutionResult,
  StoredProcedureInsight,
  StoredProcedureRequest,
} from '../types.js';
import {
  buildObjectId,
  emptyObjectStructure,
  normalizeDefinition,
  normalizeErrorMessage,
  normalizeRoutineParameterMode,
} from './shared.js';
import { mapSqlServerObjectType } from './sqlserver-object-type.js';

export { mapSqlServerObjectType } from './sqlserver-object-type.js';

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
  is_foreign_key: boolean | number;
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

type SqlServerExecuteParameterRow = {
  parameter_name: string | null;
  parameter_id: number;
  system_type: string | null;
  user_type: string | null;
  is_table_type: boolean | number;
  max_length: number | null;
  precision: number | null;
  scale: number | null;
  is_output: boolean | number;
};

type SqlServerExecuteParameter = ProcedureParameterDescriptor & {
  maxLength: number | null;
  precision: number | null;
  scale: number | null;
};

const EXECUTE_OPERATION = 'db_execute_stored_procedure';
const RECORDSET_ROW_LIMIT = 500;

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

const SQL_SERVER_CATALOG_SQL = `
      SELECT s.name AS schema_name, o.name AS object_name, o.type AS object_type
      FROM sys.objects AS o
      INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
      WHERE o.is_ms_shipped = 0 AND o.type IN ('U', 'V', 'P', 'FN', 'IF', 'TF', 'SO')
      ORDER BY s.name, o.name
    `;

export async function getSqlServerCatalog(
  config: DatabaseMcpConfig,
  query: CatalogQuery = {},
): Promise<DatabaseCatalog> {
  const pool = await connectSqlServer(config);

  try {
    const kinds = query.kinds ? new Set(query.kinds) : undefined;
    const schemaFilter = query.schema?.trim();
    const objectRows = (await pool.request().query(SQL_SERVER_CATALOG_SQL)).recordset as SqlServerCatalogRow[];

    const objects: DatabaseObjectSummary[] = objectRows
      .map((row: SqlServerCatalogRow) => {
        const kind = mapSqlServerObjectType(row.object_type);
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
      queryScript: SQL_SERVER_CATALOG_SQL.trim(),
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
  const includeRelationships = request.includeRelationships !== false;
  const includeDefinition = request.includeDefinition !== false;
  const includeDependencies = request.includeDependencies !== false;
  const includeDependents = Boolean(request.includeDependents);

  try {
    await ensureSqlServerObjectExists(pool, request.schema, request.name, request.kind);

    if (request.kind === 'table' || request.kind === 'view') {
      const includeStructure = Boolean(request.includeStructure);
      const [columnsLoaded, relationships, definitionMeta, dependencies, dependents, structure] = await Promise.all([
        loadSqlServerColumns(pool, request.schema, request.name),
        includeRelationships
          ? loadSqlServerRelationships(pool, request.schema, request.name)
          : Promise.resolve([]),
        request.kind === 'view' && includeDefinition
          ? loadSqlServerDefinitionMeta(pool, request.schema, request.name, request.kind)
          : Promise.resolve(undefined),
        request.kind === 'view' && includeDependencies
          ? loadSqlServerDependencies(pool, request.schema, request.name, request.kind)
          : Promise.resolve([]),
        includeDependents
          ? loadSqlServerDependents(pool, request.schema, request.name, request.kind)
          : Promise.resolve([]),
        includeStructure
          ? loadSqlServerStructure(pool, request.schema, request.name)
          : Promise.resolve({ ...emptyObjectStructure(), scripts: emptyStructureScripts() }),
      ]);

      return {
        object: createSummary(request.schema, request.name, request.kind, Boolean(definitionMeta?.definition)),
        columns: columnsLoaded.columns,
        parameters: [],
        definition: definitionMeta?.definition ?? null,
        definitionUnavailableReason: definitionMeta?.definitionUnavailableReason ?? null,
        dependencies,
        dependents,
        relationships,
        indexes: structure.indexes,
        triggers: structure.triggers,
        constraints: structure.constraints,
        queryScripts: {
          columns: columnsLoaded.script,
          indexes: structure.scripts.indexes,
          triggers: structure.scripts.triggers,
          constraints: structure.scripts.constraints,
        },
        warnings: [],
      };
    }

    if (request.kind === 'storedProcedure' || request.kind === 'function') {
      const needInsight = includeDefinition || includeDependencies || includeDependents;
      const [parameters, insight] = await Promise.all([
        loadSqlServerRoutineParameters(pool, request.schema, request.name),
        needInsight
          ? loadSqlServerRoutineInsight(
              pool,
              {
                schema: request.schema,
                name: request.name,
                includeDependents,
                includeDefinition,
                includeDependencies,
              },
              request.kind,
            )
          : Promise.resolve({
              schema: request.schema,
              name: request.name,
              script: null,
              scriptUnavailableReason: null,
              dependencies: [] as DependencySummary[],
              dependents: [] as DependencySummary[],
              warnings: [] as string[],
            }),
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
        ...emptyObjectStructure(),
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
      ...emptyObjectStructure(),
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

export async function executeSqlServerStoredProcedure(
  config: DatabaseMcpConfig,
  request: ExecuteStoredProcedureRequest,
): Promise<StoredProcedureExecutionResult> {
  assertSqlIdentifier(request.schema, 'Schema');
  assertSqlIdentifier(request.name, 'Procedure name');

  const objectId = `${request.schema}.${request.name}`;
  const dryRun = request.dryRun === true;

  let payload: Record<string, unknown>;
  try {
    payload = parseProcedurePayload(request.payload);
  } catch (error) {
    return createExecutionErrorResult(config, request, error, dryRun);
  }

  const pool = await connectSqlServer(config);
  let mapping: PayloadMappingResult | undefined;

  try {
    await ensureSqlServerObjectExists(pool, request.schema, request.name, 'storedProcedure');
    const parameters = await loadSqlServerExecuteParameters(pool, request.schema, request.name);
    mapping = mapPayloadToProcedureParameters(parameters, payload);
    const sql = [buildNamedExecSql(request.schema, request.name, mapping.boundParameters)];

    if (!mapping.ok) {
      return {
        ok: false,
        operation: EXECUTE_OPERATION,
        engine: config.engine,
        affectedObjects: [objectId],
        sql,
        message: mapping.error ?? 'Unable to map payload to procedure parameters.',
        warnings: mapping.warnings,
        error: mapping.error,
        boundParameters: mapping.boundParameters,
        unmatchedPayloadKeys: mapping.unmatchedPayloadKeys,
        omittedParameters: mapping.omittedParameters,
        dryRun,
        recordsets: null,
        output: null,
        returnValue: null,
        rowsAffected: null,
      };
    }

    if (dryRun) {
      return {
        ok: true,
        operation: EXECUTE_OPERATION,
        engine: config.engine,
        affectedObjects: [objectId],
        sql,
        message: `Mapped payload onto ${objectId} without executing.`,
        warnings: mapping.warnings,
        error: null,
        boundParameters: mapping.boundParameters,
        unmatchedPayloadKeys: mapping.unmatchedPayloadKeys,
        omittedParameters: mapping.omittedParameters,
        dryRun: true,
        recordsets: null,
        output: null,
        returnValue: null,
        rowsAffected: null,
      };
    }

    const boundByName = new Map(
      mapping.boundParameters.map((item) => [normalizeParameterName(item.name), item]),
    );
    const dbRequest = pool.request();

    for (const parameter of parameters) {
      const bound = boundByName.get(normalizeParameterName(parameter.name));
      const sqlType = toMssqlType(parameter);
      const bindName = parameter.name.startsWith('@') ? parameter.name.slice(1) : parameter.name;
      const isOutput = parameter.mode === 'out' || parameter.mode === 'inout';

      if (bound) {
        if (isOutput) {
          dbRequest.output(bindName, sqlType, bound.value);
        } else {
          dbRequest.input(bindName, sqlType, bound.value);
        }
      } else if (isOutput) {
        dbRequest.output(bindName, sqlType);
      }
    }

    const result = await dbRequest.execute(
      `${quoteSqlIdentifier(request.schema)}.${quoteSqlIdentifier(request.name)}`,
    );
    const capped = capRecordsets(result.recordsets);

    return {
      ok: true,
      operation: EXECUTE_OPERATION,
      engine: config.engine,
      affectedObjects: [objectId],
      sql,
      message: `Executed ${objectId}.`,
      warnings: [...mapping.warnings, ...capped.warnings],
      error: null,
      boundParameters: mapping.boundParameters,
      unmatchedPayloadKeys: mapping.unmatchedPayloadKeys,
      omittedParameters: mapping.omittedParameters,
      dryRun: false,
      recordsets: capped.recordsets,
      output: (result.output ?? {}) as Record<string, unknown>,
      returnValue: toReturnValue(result.returnValue),
      rowsAffected: Array.isArray(result.rowsAffected) ? result.rowsAffected : [],
    };
  } catch (error) {
    return createExecutionErrorResult(config, request, error, dryRun, mapping);
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

function sqlServerNvarcharLiteral(value: string): string {
  return `N'${value.replaceAll("'", "''")}'`;
}

function sqlServerSchemaNameScript(schema: string, name: string, statement: string): string {
  return [
    `DECLARE @schema nvarchar(256) = ${sqlServerNvarcharLiteral(schema)};`,
    `DECLARE @name nvarchar(256) = ${sqlServerNvarcharLiteral(name)};`,
    statement.trim(),
  ].join('\n');
}

function emptyStructureScripts(): {
  indexes: string;
  triggers: string;
  constraints: string;
} {
  return { indexes: '', triggers: '', constraints: '' };
}

async function querySqlServerBySchemaName<T>(
  pool: SqlServerPool,
  schema: string,
  name: string,
  statement: string,
): Promise<{ rows: T[]; script: string }> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(statement)).recordset as T[];
  return {
    rows,
    script: sqlServerSchemaNameScript(schema, name, statement),
  };
}

async function loadSqlServerColumns(
  pool: SqlServerPool,
  schema: string,
  name: string,
): Promise<{ columns: DatabaseColumn[]; script: string }> {
  const loaded = await querySqlServerBySchemaName<SqlServerColumnRow>(pool, schema, name, `
    SELECT c.name AS column_name, TYPE_NAME(c.user_type_id) AS data_type,
      c.max_length, c.precision, c.scale, c.is_nullable,
      CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS is_primary_key,
      CASE WHEN fk.column_id IS NULL THEN 0 ELSE 1 END AS is_foreign_key
    FROM sys.objects AS o
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    INNER JOIN sys.columns AS c ON c.object_id = o.object_id
    LEFT JOIN (
      SELECT ic.object_id, ic.column_id
      FROM sys.indexes AS i
      INNER JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      WHERE i.is_primary_key = 1
    ) AS pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
    LEFT JOIN (
      SELECT DISTINCT fkc.parent_object_id AS object_id, fkc.parent_column_id AS column_id
      FROM sys.foreign_key_columns AS fkc
    ) AS fk ON fk.object_id = c.object_id AND fk.column_id = c.column_id
    WHERE s.name = @schema AND o.name = @name
    ORDER BY c.column_id
  `);

  return {
    columns: loaded.rows.map((row: SqlServerColumnRow) => ({
      name: row.column_name,
      dataType: formatSqlServerType(row),
      nullable: Boolean(row.is_nullable),
      primaryKey: Boolean(row.is_primary_key),
      foreignKey: Boolean(row.is_foreign_key),
    })),
    script: loaded.script,
  };
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
    rows.map((row: SqlServerDependencyRow) => toDependencySummary(row, operation)),
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
    ...rows.map((row: SqlServerDependencyRow) => toDependencySummary(row, sqlServerTypeToOperation(row.object_type))),
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
    kind: 'table' as const,
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
  const includeDefinition = request.includeDefinition !== false;
  const includeDependencies = request.includeDependencies !== false;
  const [definitionMeta, dependencies, dependents] = await Promise.all([
    includeDefinition
      ? loadSqlServerDefinitionMeta(pool, request.schema, request.name, kind)
      : Promise.resolve(undefined),
    includeDependencies
      ? loadSqlServerDependencies(pool, request.schema, request.name, kind)
      : Promise.resolve([]),
    request.includeDependents
      ? loadSqlServerDependents(pool, request.schema, request.name, kind)
      : Promise.resolve([]),
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

function toDependencySummary(
  row: SqlServerDependencyRow,
  operation: DependencySummary['operation'],
): DependencySummary {
  const kind = mapSqlServerObjectType(row.object_type);
  return {
    objectId: buildObjectId(row.schema_name, row.object_name),
    operation,
    ...(kind ? { kind } : {}),
  };
}

function splitCsv(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  return value.split(', ').map((part) => part.trim()).filter((part) => part.length > 0);
}

function sqlFlag(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
}

type SqlServerIndexRow = {
  index_name: string;
  index_type: string;
  is_unique: boolean | number;
  is_primary_key: boolean | number;
  key_columns: string | null;
  included_columns: string | null;
};

type SqlServerTriggerRow = {
  trigger_name: string;
  is_disabled: boolean | number;
  is_instead_of_trigger: boolean | number;
  event_list: string | null;
};

type SqlServerConstraintRow = {
  constraint_name: string;
  constraint_kind: DatabaseConstraintKind;
  column_list: string | null;
  definition: string | null;
  referenced_object: string | null;
};

async function loadSqlServerStructure(
  pool: SqlServerPool,
  schema: string,
  name: string,
): Promise<
  Pick<DatabaseObjectDetails, 'indexes' | 'triggers' | 'constraints'> & {
    scripts: { indexes: string; triggers: string; constraints: string };
  }
> {
  const [indexes, triggers, constraints] = await Promise.all([
    loadSqlServerIndexes(pool, schema, name),
    loadSqlServerTriggers(pool, schema, name),
    loadSqlServerConstraints(pool, schema, name),
  ]);
  return {
    indexes: indexes.rows,
    triggers: triggers.rows,
    constraints: constraints.rows,
    scripts: {
      indexes: indexes.script,
      triggers: triggers.script,
      constraints: constraints.script,
    },
  };
}

async function loadSqlServerIndexes(
  pool: SqlServerPool,
  schema: string,
  name: string,
): Promise<{ rows: DatabaseIndex[]; script: string }> {
  const loaded = await querySqlServerBySchemaName<SqlServerIndexRow>(pool, schema, name, `
    SELECT
      i.name AS index_name,
      i.type_desc AS index_type,
      i.is_unique,
      i.is_primary_key,
      key_cols.columns AS key_columns,
      included_cols.columns AS included_columns
    FROM sys.indexes AS i
    INNER JOIN sys.objects AS o ON o.object_id = i.object_id
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    OUTER APPLY (
      SELECT STRING_AGG(c.name, N', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
      FROM sys.index_columns AS ic
      INNER JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE ic.object_id = i.object_id
        AND ic.index_id = i.index_id
        AND ic.is_included_column = 0
        AND ic.key_ordinal > 0
    ) AS key_cols
    OUTER APPLY (
      SELECT STRING_AGG(c.name, N', ') WITHIN GROUP (ORDER BY ic.index_column_id) AS columns
      FROM sys.index_columns AS ic
      INNER JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE ic.object_id = i.object_id
        AND ic.index_id = i.index_id
        AND ic.is_included_column = 1
    ) AS included_cols
    WHERE s.name = @schema AND o.name = @name AND i.type > 0 AND i.name IS NOT NULL
    ORDER BY i.name
  `);

  return {
    rows: loaded.rows.map((row) => ({
      name: row.index_name,
      type: row.index_type,
      unique: sqlFlag(row.is_unique),
      primaryKey: sqlFlag(row.is_primary_key),
      columns: splitCsv(row.key_columns),
      includedColumns: splitCsv(row.included_columns),
    })),
    script: loaded.script,
  };
}

async function loadSqlServerTriggers(
  pool: SqlServerPool,
  schema: string,
  name: string,
): Promise<{ rows: DatabaseTrigger[]; script: string }> {
  const loaded = await querySqlServerBySchemaName<SqlServerTriggerRow>(pool, schema, name, `
    SELECT
      tr.name AS trigger_name,
      tr.is_disabled,
      tr.is_instead_of_trigger,
      events.event_list
    FROM sys.triggers AS tr
    INNER JOIN sys.objects AS o ON o.object_id = tr.parent_id
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    OUTER APPLY (
      SELECT STRING_AGG(te.type_desc, N', ') WITHIN GROUP (ORDER BY te.type_desc) AS event_list
      FROM sys.trigger_events AS te
      WHERE te.object_id = tr.object_id
    ) AS events
    WHERE s.name = @schema AND o.name = @name
    ORDER BY tr.name
  `);

  return {
    rows: loaded.rows.map((row) => ({
      name: row.trigger_name,
      disabled: sqlFlag(row.is_disabled),
      insteadOf: sqlFlag(row.is_instead_of_trigger),
      events: splitCsv(row.event_list),
    })),
    script: loaded.script,
  };
}

async function loadSqlServerConstraints(
  pool: SqlServerPool,
  schema: string,
  name: string,
): Promise<{ rows: DatabaseConstraint[]; script: string }> {
  const loaded = await querySqlServerBySchemaName<SqlServerConstraintRow>(pool, schema, name, `
    SELECT
      kc.name AS constraint_name,
      CASE kc.type WHEN 'PK' THEN 'primaryKey' ELSE 'unique' END AS constraint_kind,
      cols.columns AS column_list,
      CAST(NULL AS nvarchar(max)) AS definition,
      CAST(NULL AS nvarchar(512)) AS referenced_object
    FROM sys.key_constraints AS kc
    INNER JOIN sys.objects AS o ON o.object_id = kc.parent_object_id
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    OUTER APPLY (
      SELECT STRING_AGG(c.name, N', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS columns
      FROM sys.indexes AS i
      INNER JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
      INNER JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
      WHERE i.object_id = kc.parent_object_id
        AND i.name = kc.name
        AND ic.is_included_column = 0
        AND ic.key_ordinal > 0
    ) AS cols
    WHERE s.name = @schema AND o.name = @name

    UNION ALL

    SELECT
      fk.name,
      'foreignKey',
      cols.columns,
      CAST(NULL AS nvarchar(max)),
      rs.name + N'.' + rt.name
    FROM sys.foreign_keys AS fk
    INNER JOIN sys.objects AS o ON o.object_id = fk.parent_object_id
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    INNER JOIN sys.objects AS rt ON rt.object_id = fk.referenced_object_id
    INNER JOIN sys.schemas AS rs ON rs.schema_id = rt.schema_id
    OUTER APPLY (
      SELECT STRING_AGG(c.name, N', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS columns
      FROM sys.foreign_key_columns AS fkc
      INNER JOIN sys.columns AS c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
      WHERE fkc.constraint_object_id = fk.object_id
    ) AS cols
    WHERE s.name = @schema AND o.name = @name

    UNION ALL

    SELECT
      cc.name,
      'check',
      cols.columns,
      cc.definition,
      CAST(NULL AS nvarchar(512))
    FROM sys.check_constraints AS cc
    INNER JOIN sys.objects AS o ON o.object_id = cc.parent_object_id
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    OUTER APPLY (
      SELECT STRING_AGG(c.name, N', ') WITHIN GROUP (ORDER BY c.column_id) AS columns
      FROM sys.columns AS c
      WHERE c.object_id = cc.parent_object_id AND c.column_id = cc.parent_column_id
    ) AS cols
    WHERE s.name = @schema AND o.name = @name

    UNION ALL

    SELECT
      dc.name,
      'default',
      c.name,
      dc.definition,
      CAST(NULL AS nvarchar(512))
    FROM sys.default_constraints AS dc
    INNER JOIN sys.objects AS o ON o.object_id = dc.parent_object_id
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    INNER JOIN sys.columns AS c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE s.name = @schema AND o.name = @name

    ORDER BY constraint_name
  `);

  return {
    rows: loaded.rows.map((row) => ({
      name: row.constraint_name,
      kind: row.constraint_kind,
      columns: splitCsv(row.column_list),
      definition: row.definition,
      referencedObjectId: row.referenced_object,
    })),
    script: loaded.script,
  };
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
  const normalized = type?.trim() ?? null;
  return normalized === 'P' || normalized === 'FN' || normalized === 'IF' || normalized === 'TF'
    ? 'execute'
    : 'select';
}

async function loadSqlServerExecuteParameters(
  pool: SqlServerPool,
  schema: string,
  name: string,
): Promise<SqlServerExecuteParameter[]> {
  const request = pool.request();
  request.input('schema', sql.NVarChar, schema);
  request.input('name', sql.NVarChar, name);
  const rows = (await request.query(`
    SELECT p.name AS parameter_name, p.parameter_id,
      TYPE_NAME(p.system_type_id) AS system_type,
      TYPE_NAME(p.user_type_id) AS user_type,
      t.is_table_type, p.max_length, p.precision, p.scale, p.is_output
    FROM sys.objects AS o
    INNER JOIN sys.schemas AS s ON s.schema_id = o.schema_id
    INNER JOIN sys.parameters AS p ON p.object_id = o.object_id
    INNER JOIN sys.types AS t ON t.user_type_id = p.user_type_id
    WHERE s.name = @schema AND o.name = @name AND p.parameter_id > 0
    ORDER BY p.parameter_id
  `)).recordset as SqlServerExecuteParameterRow[];

  return rows.map((row: SqlServerExecuteParameterRow) => {
    const isTableType = Boolean(row.is_table_type);
    const systemType = row.system_type ?? row.user_type ?? 'nvarchar';
    const displayType = isTableType
      ? (row.user_type ?? systemType)
      : formatSqlServerType({
        data_type: systemType,
        max_length: row.max_length,
        precision: row.precision,
        scale: row.scale,
      });

    return {
      name: row.parameter_name ?? `@param${row.parameter_id}`,
      dataType: displayType,
      systemType,
      mode: Boolean(row.is_output) ? 'out' : 'in',
      isTableType,
      maxLength: row.max_length,
      precision: row.precision,
      scale: row.scale,
    };
  });
}

function toMssqlType(parameter: SqlServerExecuteParameter) {
  const type = parameter.systemType.trim().toLowerCase();
  const maxLength = parameter.maxLength;

  switch (type) {
    case 'int':
      return sql.Int;
    case 'bigint':
      return sql.BigInt;
    case 'smallint':
      return sql.SmallInt;
    case 'tinyint':
      return sql.TinyInt;
    case 'bit':
      return sql.Bit;
    case 'decimal':
    case 'numeric':
      return sql.Decimal(parameter.precision ?? 18, parameter.scale ?? 0);
    case 'money':
      return sql.Money;
    case 'smallmoney':
      return sql.SmallMoney;
    case 'float':
      return sql.Float;
    case 'real':
      return sql.Real;
    case 'nvarchar':
    case 'sysname':
      return sql.NVarChar(unicodeLength(maxLength));
    case 'nchar':
      return sql.NChar(fixedUnicodeLength(maxLength));
    case 'varchar':
      return sql.VarChar(maxLength == null || maxLength < 0 ? sql.MAX : maxLength);
    case 'char':
      return sql.Char(maxLength == null || maxLength < 0 ? 8000 : maxLength);
    case 'text':
      return sql.Text;
    case 'ntext':
      return sql.NText;
    case 'xml':
      return sql.Xml;
    case 'json':
      return sql.NVarChar(sql.MAX);
    case 'uniqueidentifier':
      return sql.UniqueIdentifier;
    case 'date':
      return sql.Date;
    case 'datetime':
      return sql.DateTime;
    case 'datetime2':
      return sql.DateTime2(parameter.scale ?? 7);
    case 'smalldatetime':
      return sql.SmallDateTime;
    case 'datetimeoffset':
      return sql.DateTimeOffset(parameter.scale ?? 7);
    case 'time':
      return sql.Time(parameter.scale ?? 7);
    case 'binary':
      return sql.Binary(maxLength == null || maxLength < 0 ? 8000 : maxLength);
    case 'varbinary':
    case 'image':
    case 'timestamp':
    case 'rowversion':
      return sql.VarBinary(maxLength == null || maxLength < 0 ? sql.MAX : maxLength);
    default:
      throw new Error(`Unsupported SQL Server parameter type ${parameter.dataType} for ${parameter.name}.`);
  }
}

function unicodeLength(maxLength: number | null): number {
  if (maxLength == null || maxLength < 0) {
    return sql.MAX;
  }

  const characters = Math.floor(maxLength / 2);
  return characters > 0 ? characters : sql.MAX;
}

function fixedUnicodeLength(maxLength: number | null): number {
  const length = unicodeLength(maxLength);
  return length === sql.MAX ? 4000 : length;
}

function capRecordsets(recordsets: unknown): {
  recordsets: Record<string, unknown>[][];
  warnings: string[];
} {
  const sets = Array.isArray(recordsets) ? recordsets : [];
  let truncated = false;
  const capped = sets.map((set) => {
    if (!Array.isArray(set)) {
      return [];
    }

    if (set.length > RECORDSET_ROW_LIMIT) {
      truncated = true;
      return set.slice(0, RECORDSET_ROW_LIMIT) as Record<string, unknown>[];
    }

    return set as Record<string, unknown>[];
  });

  return {
    recordsets: capped,
    warnings: truncated ? [`One or more recordsets were truncated to ${RECORDSET_ROW_LIMIT} rows.`] : [],
  };
}

function createExecutionErrorResult(
  config: DatabaseMcpConfig,
  request: ExecuteStoredProcedureRequest,
  error: unknown,
  dryRun: boolean,
  mapping?: PayloadMappingResult,
): StoredProcedureExecutionResult {
  const message = normalizeErrorMessage(error, `Unable to complete ${EXECUTE_OPERATION}.`);

  return {
    ok: false,
    operation: EXECUTE_OPERATION,
    engine: config.engine,
    affectedObjects: [`${request.schema}.${request.name}`],
    sql: mapping ? [buildNamedExecSql(request.schema, request.name, mapping.boundParameters)] : [],
    message,
    warnings: mapping?.warnings ?? [],
    error: message,
    boundParameters: mapping?.boundParameters ?? [],
    unmatchedPayloadKeys: mapping?.unmatchedPayloadKeys ?? [],
    omittedParameters: mapping?.omittedParameters ?? [],
    dryRun,
    recordsets: null,
    output: null,
    returnValue: null,
    rowsAffected: null,
  };
}

function toReturnValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}