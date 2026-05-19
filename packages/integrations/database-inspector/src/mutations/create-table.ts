import type { CreateTableRequest, DatabaseMcpConfig, OperationResult } from '../types.js';
import { createSqliteTable } from '../engines/sqlite.js';

export async function createTable(config: DatabaseMcpConfig, request: CreateTableRequest): Promise<OperationResult> {
  if (config.engine !== 'sqlite') {
    return unsupportedOperation(config.engine, 'db_create_table');
  }

  const sql = createSqliteTable(config, request.schema, request.name, request.columns, request.primaryKey, request.ifNotExists);
  return {
    ok: true,
    operation: 'db_create_table',
    engine: config.engine,
    affectedObjects: [`${request.schema ?? config.schema ?? 'main'}.${request.name}`],
    sql,
    message: `Created table ${request.name}.`,
    warnings: [],
    error: null,
  };
}

function unsupportedOperation(engine: DatabaseMcpConfig['engine'], operation: string): OperationResult {
  return {
    ok: false,
    operation,
    engine,
    affectedObjects: [],
    sql: [],
    message: `Operation ${operation} is not implemented for ${engine}.`,
    warnings: [],
    error: `Operation ${operation} is not implemented for ${engine}.`,
  };
}
