import { createTable, type CreateTableRequest, type DatabaseMcpConfig } from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createCreateTableHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const request: CreateTableRequest = {
      schema: typeof args.schema === 'string' ? args.schema : undefined,
      name: String(args.name ?? ''),
      columns: Array.isArray(args.columns) ? (args.columns as CreateTableRequest['columns']) : [],
      primaryKey: Array.isArray(args.primaryKey) ? (args.primaryKey as string[]) : undefined,
      ifNotExists: typeof args.ifNotExists === 'boolean' ? args.ifNotExists : false,
    };

    try {
      return jsonToolResult(await createTable(config, request));
    } catch (error) {
      return operationErrorToolResult(
        config,
        'db_create_table',
        error,
        [`${request.schema ?? config.schema ?? 'main'}.${request.name}`],
      );
    }
  };
}
