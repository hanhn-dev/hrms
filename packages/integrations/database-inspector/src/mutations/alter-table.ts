import type { AlterTableRequest, DatabaseMcpConfig, OperationResult } from '../types.js';
import { alterSqliteTable } from '../engines/sqlite.js';

export async function alterTable(config: DatabaseMcpConfig, request: AlterTableRequest): Promise<OperationResult> {
  if (
    !request.renameTo &&
    request.addColumns.length === 0 &&
    request.alterColumns.length === 0 &&
    request.dropColumns.length === 0 &&
    request.addConstraints.length === 0 &&
    request.dropConstraints.length === 0
  ) {
    return {
      ok: false,
      operation: 'db_alter_table',
      engine: config.engine,
      affectedObjects: [`${request.schema ?? config.schema ?? 'main'}.${request.name}`],
      sql: [],
      message: 'Unable to alter table.',
      warnings: [],
      error: 'Alter table requires at least one change operation.',
    };
  }

  if (config.engine !== 'sqlite') {
    return unsupportedOperation(config.engine, 'db_alter_table', request.name);
  }

  if (request.alterColumns.length > 0 || request.dropColumns.length > 0 || request.addConstraints.length > 0 || request.dropConstraints.length > 0) {
    return {
      ok: false,
      operation: 'db_alter_table',
      engine: config.engine,
      affectedObjects: [`${request.schema ?? config.schema ?? 'main'}.${request.name}`],
      sql: [],
      message: 'Unable to alter table.',
      warnings: [],
      error: 'SQLite currently supports table rename and add-column operations only.',
    };
  }

  const sql = alterSqliteTable(config, request);
  return {
    ok: true,
    operation: 'db_alter_table',
    engine: config.engine,
    affectedObjects: [`${request.schema ?? config.schema ?? 'main'}.${request.renameTo ?? request.name}`],
    sql,
    message: `Altered table ${request.name}.`,
    warnings: [],
    error: null,
  };
}

function unsupportedOperation(
  engine: DatabaseMcpConfig['engine'],
  operation: string,
  tableName: string,
): OperationResult {
  return {
    ok: false,
    operation,
    engine,
    affectedObjects: [tableName],
    sql: [],
    message: `Operation ${operation} is not implemented for ${engine}.`,
    warnings: [],
    error: `Operation ${operation} is not implemented for ${engine}.`,
  };
}
