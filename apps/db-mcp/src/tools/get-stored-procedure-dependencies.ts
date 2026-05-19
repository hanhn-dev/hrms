import {
  getStoredProcedureDependencies,
  type DatabaseMcpConfig,
  type StoredProcedureRequest,
} from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createGetStoredProcedureDependenciesHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const request: StoredProcedureRequest = {
      schema: String(args.schema ?? ''),
      name: String(args.name ?? ''),
      includeDependents: typeof args.includeDependents === 'boolean' ? args.includeDependents : false,
    };

    try {
      return jsonToolResult(await getStoredProcedureDependencies(config, request));
    } catch (error) {
      return operationErrorToolResult(config, 'db_get_stored_procedure_dependencies', error, [`${request.schema}.${request.name}`]);
    }
  };
}