import { getCatalog, type CatalogQuery, type DatabaseMcpConfig, type DatabaseObjectKind } from '@hrms/database-inspector';

import { jsonToolResult, operationErrorToolResult, type ToolCallback } from '../tool-types.js';

export function createGetCatalogHandler(config: DatabaseMcpConfig): ToolCallback {
  return async (args) => {
    const query: CatalogQuery = {
      schema: typeof args.schema === 'string' ? args.schema : undefined,
      kinds: Array.isArray(args.kinds) ? args.kinds.filter((value): value is DatabaseObjectKind => typeof value === 'string') : undefined,
      includeRelationships: typeof args.includeRelationships === 'boolean' ? args.includeRelationships : false,
    };

    try {
      return jsonToolResult(await getCatalog(config, query));
    } catch (error) {
      return operationErrorToolResult(config, 'db_get_catalog', error);
    }
  };
}
