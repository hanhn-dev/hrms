import { getObjectDetails, type DatabaseMcpConfig, type ObjectDetailsRequest } from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createGetObjectDetailsHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const request: ObjectDetailsRequest = {
      schema: String(args.schema ?? ''),
      name: String(args.name ?? ''),
      kind: args.kind as ObjectDetailsRequest['kind'],
      includeDependents: typeof args.includeDependents === 'boolean' ? args.includeDependents : false,
    };

    try {
      return jsonToolResult(await getObjectDetails(config, request));
    } catch (error) {
      return operationErrorToolResult(config, 'db_get_object_details', error, [`${request.schema}.${request.name}`]);
    }
  };
}
