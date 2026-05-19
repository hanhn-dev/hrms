import { alterTable, type AlterTableRequest, type DatabaseMcpConfig } from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createAlterTableHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const request: AlterTableRequest = {
      schema: typeof args.schema === 'string' ? args.schema : undefined,
      name: String(args.name ?? ''),
      renameTo: typeof args.renameTo === 'string' ? args.renameTo : undefined,
      addColumns: Array.isArray(args.addColumns) ? (args.addColumns as AlterTableRequest['addColumns']) : [],
      alterColumns: Array.isArray(args.alterColumns) ? (args.alterColumns as AlterTableRequest['alterColumns']) : [],
      dropColumns: Array.isArray(args.dropColumns) ? (args.dropColumns as string[]) : [],
      addConstraints: Array.isArray(args.addConstraints) ? (args.addConstraints as AlterTableRequest['addConstraints']) : [],
      dropConstraints: Array.isArray(args.dropConstraints) ? (args.dropConstraints as string[]) : [],
    };

    try {
      return jsonToolResult(await alterTable(config, request));
    } catch (error) {
      return operationErrorToolResult(
        config,
        'db_alter_table',
        error,
        [`${request.schema ?? config.schema ?? 'main'}.${request.name}`],
      );
    }
  };
}
