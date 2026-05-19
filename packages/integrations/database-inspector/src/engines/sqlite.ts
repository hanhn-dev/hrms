import { DatabaseSync } from 'node:sqlite';

import type {
  CatalogQuery,
  CreateTableColumn,
  DatabaseCatalog,
  DatabaseColumn,
  DatabaseMcpConfig,
  DatabaseObjectDetails,
  DatabaseObjectKind,
  DatabaseObjectSummary,
  DatabaseRelationship,
  DependencySummary,
  ObjectDetailsRequest,
  RelationshipMutationRequest,
  StoredProcedureInsight,
  StoredProcedureRequest,
} from '../types.js';

interface SqliteMasterRow {
  readonly name: string;
  readonly type: 'table' | 'view' | 'trigger';
  readonly tbl_name: string;
  readonly sql: string | null;
}

interface SqliteTableInfoRow {
  readonly cid: number;
  readonly name: string;
  readonly type: string;
  readonly notnull: number;
  readonly dflt_value: string | null;
  readonly pk: number;
}

interface SqliteForeignKeyRow {
  readonly id: number;
  readonly seq: number;
  readonly table: string;
  readonly from: string;
  readonly to: string;
  readonly on_update: string;
  readonly on_delete: string;
}

interface SqliteForeignKeyDefinition {
  readonly sourceColumns: readonly string[];
  readonly targetTable: string;
  readonly targetColumns: readonly string[];
  readonly onDelete?: string;
  readonly onUpdate?: string;
}

export function getSqliteCatalog(config: DatabaseMcpConfig, query: CatalogQuery = {}): DatabaseCatalog {
  return withDatabase(config, true, (database) => {
    const schema = query.schema?.trim() || 'main';
    const kinds = query.kinds ? new Set(query.kinds) : undefined;
    const masterRows = readMasterRows(database)
      .filter((row) => row.type === 'table' || row.type === 'view')
      .filter((row) => matchesKind(kinds, mapSqliteTypeToKind(row.type)))
      .sort((left, right) => left.name.localeCompare(right.name));

    const objects = masterRows.map<DatabaseObjectSummary>((row) => ({
      id: buildObjectId(schema, row.name),
      schema,
      name: row.name,
      kind: mapSqliteTypeToKind(row.type),
      definitionAvailable: row.sql !== null,
      dependencySupport: 'partial',
    }));

    const relationships = query.includeRelationships
      ? objects.flatMap((object) => readTableRelationships(database, schema, object.name))
      : [];

    return {
      engine: 'sqlite',
      schemas: [schema],
      objects,
      relationships,
      warnings: [],
    };
  });
}

export function getSqliteObjectDetails(config: DatabaseMcpConfig, request: ObjectDetailsRequest): DatabaseObjectDetails {
  return withDatabase(config, true, (database) => {
    const schema = request.schema || 'main';
    const masterRow = readMasterRows(database).find(
      (row) => row.name === request.name && mapSqliteTypeToKind(row.type) === request.kind,
    );

    if (!masterRow) {
      throw new Error(`Unable to find ${request.kind} ${schema}.${request.name}.`);
    }

    const object: DatabaseObjectSummary = {
      id: buildObjectId(schema, request.name),
      schema,
      name: request.name,
      kind: request.kind,
      definitionAvailable: masterRow.sql !== null,
      dependencySupport: 'partial',
    };

    const columns = request.kind === 'table' || request.kind === 'view' ? readTableColumns(database, request.name) : [];
    const relationships = request.kind === 'table' ? readTableRelationships(database, schema, request.name) : [];
    const dependents = request.includeDependents ? readDependentTables(database, schema, request.name) : [];

    return {
      object,
      columns,
      parameters: [],
      definition: masterRow.sql,
      definitionUnavailableReason: masterRow.sql ? null : `Definition is unavailable for ${schema}.${request.name}.`,
      dependencies: [],
      dependents,
      relationships,
      warnings: [],
    };
  });
}

export function getSqliteStoredProcedureScript(_config: DatabaseMcpConfig, request: StoredProcedureRequest): StoredProcedureInsight {
  return {
    schema: request.schema,
    name: request.name,
    script: null,
    scriptUnavailableReason: 'SQLite does not expose stored procedures.',
    dependencies: [],
    dependents: [],
    warnings: ['Stored procedure inspection is unsupported for SQLite.'],
  };
}

export function getSqliteStoredProcedureDependencies(
  _config: DatabaseMcpConfig,
  request: StoredProcedureRequest,
): StoredProcedureInsight {
  return {
    schema: request.schema,
    name: request.name,
    script: null,
    scriptUnavailableReason: 'SQLite does not expose stored procedures.',
    dependencies: [],
    dependents: [],
    warnings: ['Stored procedure dependency inspection is unsupported for SQLite.'],
  };
}

export function createSqliteTable(config: DatabaseMcpConfig, schema: string | undefined, name: string, columns: readonly CreateTableColumn[], primaryKey: readonly string[] | undefined, ifNotExists: boolean): string[] {
  return withDatabase(config, false, (database) => {
    const sql = buildCreateTableSql(schema, name, columns, primaryKey, ifNotExists);
    database.exec(sql);
    return [sql];
  });
}

export function alterSqliteTable(
  config: DatabaseMcpConfig,
  request: {
    schema: string | undefined;
    name: string;
    renameTo: string | undefined;
    addColumns: readonly CreateTableColumn[];
  },
): string[] {
  return withDatabase(config, false, (database) => {
    const statements: string[] = [];
    const schema = request.schema;
    let currentName = request.name;

    if (request.renameTo && request.renameTo !== request.name) {
      const renameSql = `ALTER TABLE ${qualifiedTableName(schema, currentName)} RENAME TO ${quoteIdentifier(request.renameTo)}`;
      database.exec(renameSql);
      statements.push(renameSql);
      currentName = request.renameTo;
    }

    for (const column of request.addColumns) {
      const addColumnSql = `ALTER TABLE ${qualifiedTableName(schema, currentName)} ADD COLUMN ${buildColumnDefinition(column, false)}`;
      database.exec(addColumnSql);
      statements.push(addColumnSql);
    }

    return statements;
  });
}

export function addSqliteRelationship(config: DatabaseMcpConfig, request: RelationshipMutationRequest): string[] {
  return withDatabase(config, false, (database) => {
    const schema = request.fromSchema ?? 'main';
    const targetSchema = request.toSchema ?? 'main';
    const tableName = request.fromTable;
    const tableInfo = readTableInfo(database, tableName);
    if (tableInfo.length === 0) {
      throw new Error(`Unable to find table ${schema}.${tableName}.`);
    }
    if (!tableInfo.some((column) => column.name === request.fromColumn)) {
      throw new Error(`Unable to find column ${schema}.${tableName}.${request.fromColumn}.`);
    }

    const targetTableInfo = readTableInfo(database, request.toTable);
    if (targetTableInfo.length === 0) {
      throw new Error(`Unable to find referenced table ${targetSchema}.${request.toTable}.`);
    }
    if (!targetTableInfo.some((column) => column.name === request.toColumn)) {
      throw new Error(`Unable to find referenced column ${targetSchema}.${request.toTable}.${request.toColumn}.`);
    }

    const existingForeignKeys = readForeignKeys(database, tableName);
    const nextForeignKeys = [
      ...existingForeignKeys,
      {
        sourceColumns: [request.fromColumn],
        targetTable: request.toTable,
        targetColumns: [request.toColumn],
        onDelete: normalizeAction(request.onDelete),
        onUpdate: normalizeAction(request.onUpdate),
      },
    ];

    const createSql = buildCreateTableSqlFromExisting(schema, tableName, tableInfo, nextForeignKeys);
    const tempName = `__db_mcp_old_${tableName}`;
    const quotedColumns = tableInfo.map((column) => quoteIdentifier(column.name)).join(', ');
    const statements = [
      'PRAGMA foreign_keys = OFF',
      'BEGIN TRANSACTION',
      `ALTER TABLE ${qualifiedTableName(schema, tableName)} RENAME TO ${quoteIdentifier(tempName)}`,
      createSql,
      `INSERT INTO ${qualifiedTableName(schema, tableName)} (${quotedColumns}) SELECT ${quotedColumns} FROM ${quoteIdentifier(tempName)}`,
      `DROP TABLE ${quoteIdentifier(tempName)}`,
      'COMMIT',
      'PRAGMA foreign_keys = ON',
    ];

    for (const statement of statements) {
      database.exec(statement);
    }

    return statements;
  });
}

function withDatabase<T>(config: DatabaseMcpConfig, readOnly: boolean, callback: (database: DatabaseSync) => T): T {
  const filePath = config.sqlitePath;
  if (!filePath) {
    throw new Error('DB_MCP_SQLITE_PATH is required for SQLite operations.');
  }

  const database = new DatabaseSync(filePath, { open: true, readOnly });

  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function readMasterRows(database: DatabaseSync): SqliteMasterRow[] {
  return database
    .prepare(`
      SELECT name, type, tbl_name, sql
      FROM sqlite_master
      WHERE type IN ('table', 'view', 'trigger')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY type, name
    `)
    .all() as unknown as SqliteMasterRow[];
}

function readTableInfo(database: DatabaseSync, tableName: string): SqliteTableInfoRow[] {
  return database.prepare(`PRAGMA table_info(${quotePragmaIdentifier(tableName)})`).all() as unknown as SqliteTableInfoRow[];
}

function readTableColumns(database: DatabaseSync, tableName: string): DatabaseColumn[] {
  return readTableInfo(database, tableName).map((column) => ({
    name: column.name,
    dataType: column.type || 'TEXT',
    nullable: !column.notnull,
    primaryKey: Boolean(column.pk),
  }));
}

function readForeignKeys(database: DatabaseSync, tableName: string): SqliteForeignKeyDefinition[] {
  const rows = database.prepare(`PRAGMA foreign_key_list(${quotePragmaIdentifier(tableName)})`).all() as unknown as SqliteForeignKeyRow[];
  const groups = new Map<number, SqliteForeignKeyRow[]>();

  for (const row of rows) {
    const current = groups.get(row.id) ?? [];
    current.push(row);
    groups.set(row.id, current);
  }

  return [...groups.values()].map((group) => ({
    sourceColumns: group.map((row) => row.from),
    targetTable: group[0]!.table,
    targetColumns: group.map((row) => row.to || 'id'),
    onDelete: normalizeAction(group[0]!.on_delete),
    onUpdate: normalizeAction(group[0]!.on_update),
  }));
}

function readTableRelationships(database: DatabaseSync, schema: string, tableName: string): DatabaseRelationship[] {
  return readForeignKeys(database, tableName).map((foreignKey, index) => ({
    id: `${tableName}:${index}`,
    from: { objectId: buildObjectId(schema, tableName), column: foreignKey.sourceColumns[0] ?? 'id' },
    to: { objectId: buildObjectId(schema, foreignKey.targetTable), column: foreignKey.targetColumns[0] ?? 'id' },
    label: `${tableName}.${foreignKey.sourceColumns[0] ?? 'id'} -> ${foreignKey.targetTable}.${foreignKey.targetColumns[0] ?? 'id'}`,
  }));
}

function readDependentTables(database: DatabaseSync, schema: string, targetTableName: string): DependencySummary[] {
  return readMasterRows(database)
    .filter((row) => row.type === 'table')
    .flatMap((row) =>
      readForeignKeys(database, row.name)
        .filter((foreignKey) => foreignKey.targetTable === targetTableName)
        .map<DependencySummary>(() => ({
          objectId: buildObjectId(schema, row.name),
          operation: 'select',
        })),
    );
}

function buildCreateTableSql(
  schema: string | undefined,
  name: string,
  columns: readonly CreateTableColumn[],
  primaryKey: readonly string[] | undefined,
  ifNotExists: boolean,
): string {
  const resolvedPrimaryKey = primaryKey && primaryKey.length > 0 ? [...primaryKey] : columns.filter((column) => column.primaryKey).map((column) => column.name);
  const inlinePrimaryKey = resolvedPrimaryKey.length === 1 ? resolvedPrimaryKey[0] : undefined;
  const columnDefinitions = columns.map((column) => buildColumnDefinition(column, inlinePrimaryKey === column.name));
  const tableConstraints = inlinePrimaryKey
    ? []
    : resolvedPrimaryKey.length > 0
      ? [`PRIMARY KEY (${resolvedPrimaryKey.map(quoteIdentifier).join(', ')})`]
      : [];
  const lines = [...columnDefinitions, ...tableConstraints];
  const ifNotExistsClause = ifNotExists ? ' IF NOT EXISTS' : '';

  return `CREATE TABLE${ifNotExistsClause} ${qualifiedTableName(schema, name)} (\n  ${lines.join(',\n  ')}\n)`;
}

function buildCreateTableSqlFromExisting(
  schema: string | undefined,
  tableName: string,
  tableInfo: readonly SqliteTableInfoRow[],
  foreignKeys: readonly SqliteForeignKeyDefinition[],
): string {
  const primaryKeys = tableInfo.filter((column) => column.pk > 0).sort((left, right) => left.pk - right.pk).map((column) => column.name);
  const inlinePrimaryKey = primaryKeys.length === 1 ? primaryKeys[0] : undefined;
  const columnLines = tableInfo.map((column) => {
    const definition: CreateTableColumn = {
      name: column.name,
      dataType: column.type || 'TEXT',
      nullable: !column.notnull,
      primaryKey: Boolean(column.pk),
      defaultValue: column.dflt_value ?? undefined,
    };
    return buildColumnDefinition(definition, inlinePrimaryKey === column.name);
  });
  const tableConstraints: string[] = [];

  if (!inlinePrimaryKey && primaryKeys.length > 0) {
    tableConstraints.push(`PRIMARY KEY (${primaryKeys.map(quoteIdentifier).join(', ')})`);
  }

  for (const foreignKey of foreignKeys) {
    const parts = [
      `FOREIGN KEY (${foreignKey.sourceColumns.map(quoteIdentifier).join(', ')})`,
      `REFERENCES ${quoteIdentifier(foreignKey.targetTable)} (${foreignKey.targetColumns.map(quoteIdentifier).join(', ')})`,
    ];
    if (foreignKey.onDelete) {
      parts.push(`ON DELETE ${foreignKey.onDelete.toUpperCase()}`);
    }
    if (foreignKey.onUpdate) {
      parts.push(`ON UPDATE ${foreignKey.onUpdate.toUpperCase()}`);
    }
    tableConstraints.push(parts.join(' '));
  }

  return `CREATE TABLE ${qualifiedTableName(schema, tableName)} (\n  ${[...columnLines, ...tableConstraints].join(',\n  ')}\n)`;
}

function buildColumnDefinition(column: CreateTableColumn, inlinePrimaryKey: boolean): string {
  const parts = [quoteIdentifier(column.name), column.dataType];
  if (!column.nullable) {
    parts.push('NOT NULL');
  }
  if (column.unique) {
    parts.push('UNIQUE');
  }
  if (column.defaultValue !== undefined) {
    parts.push(`DEFAULT ${column.defaultValue}`);
  }
  if (inlinePrimaryKey) {
    parts.push('PRIMARY KEY');
  }
  return parts.join(' ');
}

function matchesKind(kinds: Set<DatabaseObjectKind> | undefined, kind: DatabaseObjectKind): boolean {
  return kinds ? kinds.has(kind) : true;
}

function mapSqliteTypeToKind(type: SqliteMasterRow['type']): DatabaseObjectKind {
  if (type === 'view') {
    return 'view';
  }
  if (type === 'trigger') {
    return 'trigger';
  }
  return 'table';
}

function buildObjectId(schema: string, name: string): string {
  return `${schema}.${name}`;
}

function qualifiedTableName(schema: string | undefined, name: string): string {
  if (schema && schema !== 'main') {
    return `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;
  }
  return quoteIdentifier(name);
}

function quoteIdentifier(identifier: string): string {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

function quotePragmaIdentifier(identifier: string): string {
  return `'${String(identifier).replaceAll("'", "''")}'`;
}

function normalizeAction(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'no action' || normalized === 'noaction') {
    return 'no action';
  }
  if (normalized === 'set null' || normalized === 'setnull') {
    return 'set null';
  }
  return normalized;
}
