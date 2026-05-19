import type { DatabaseMcpConfig, OperationResult, RelationshipMutationRequest } from '../types.js';
import { addSqliteRelationship } from '../engines/sqlite.js';

export async function addRelationship(
  config: DatabaseMcpConfig,
  request: RelationshipMutationRequest,
): Promise<OperationResult> {
  if (config.engine !== 'sqlite') {
    return {
      ok: false,
      operation: 'db_add_relationship',
      engine: config.engine,
      affectedObjects: [],
      sql: [],
      message: `Operation db_add_relationship is not implemented for ${config.engine}.`,
      warnings: [],
      error: `Operation db_add_relationship is not implemented for ${config.engine}.`,
    };
  }

  const sql = addSqliteRelationship(config, request);
  return {
    ok: true,
    operation: 'db_add_relationship',
    engine: config.engine,
    affectedObjects: [`${request.fromSchema ?? config.schema ?? 'main'}.${request.fromTable}`],
    sql,
    message: `Added relationship from ${request.fromTable}.${request.fromColumn} to ${request.toTable}.${request.toColumn}.`,
    warnings: [],
    error: null,
  };
}
