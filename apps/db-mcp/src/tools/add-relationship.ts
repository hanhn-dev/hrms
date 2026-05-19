import { addRelationship, type DatabaseMcpConfig, type RelationshipMutationRequest } from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createAddRelationshipHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const request: RelationshipMutationRequest = {
      fromSchema: typeof args.fromSchema === 'string' ? args.fromSchema : undefined,
      fromTable: String(args.fromTable ?? ''),
      fromColumn: String(args.fromColumn ?? ''),
      toSchema: typeof args.toSchema === 'string' ? args.toSchema : undefined,
      toTable: String(args.toTable ?? ''),
      toColumn: String(args.toColumn ?? ''),
      constraintName: typeof args.constraintName === 'string' ? args.constraintName : undefined,
      onDelete: typeof args.onDelete === 'string' ? (args.onDelete as RelationshipMutationRequest['onDelete']) : undefined,
      onUpdate: typeof args.onUpdate === 'string' ? (args.onUpdate as RelationshipMutationRequest['onUpdate']) : undefined,
    };

    try {
      return jsonToolResult(await addRelationship(config, request));
    } catch (error) {
      return operationErrorToolResult(
        config,
        'db_add_relationship',
        error,
        [`${request.fromSchema ?? config.schema ?? 'main'}.${request.fromTable}`],
      );
    }
  };
}
