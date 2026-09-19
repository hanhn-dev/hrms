import {
  executeStoredProcedure,
  type DatabaseMcpConfig,
  type ExecuteStoredProcedureRequest,
} from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createExecuteStoredProcedureHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const request: ExecuteStoredProcedureRequest = {
      schema: String(args.schema ?? ''),
      name: String(args.name ?? ''),
      payload: args.payload,
      dryRun: typeof args.dryRun === 'boolean' ? args.dryRun : false,
    };

    try {
      return jsonToolResult(await executeStoredProcedure(config, request));
    } catch (error) {
      return operationErrorToolResult(config, 'db_execute_stored_procedure', error, [
        `${request.schema}.${request.name}`,
      ]);
    }
  };
}
