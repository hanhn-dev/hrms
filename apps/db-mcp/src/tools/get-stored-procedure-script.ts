import {
  getStoredProcedureScript,
  type DatabaseMcpConfig,
  type StoredProcedureRequest,
} from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createGetStoredProcedureScriptHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const request: StoredProcedureRequest = {
      schema: String(args.schema ?? ''),
      name: String(args.name ?? ''),
    };

    try {
      return jsonToolResult(await getStoredProcedureScript(config, request));
    } catch (error) {
      return operationErrorToolResult(config, 'db_get_stored_procedure_script', error, [`${request.schema}.${request.name}`]);
    }
  };
}