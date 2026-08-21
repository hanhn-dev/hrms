import { searchWorkItems, type AzureDevOpsClient, type AzureDevOpsConfig, type SearchWorkItemsFilter } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export function createSearchWorkItemsHandler(client: AzureDevOpsClient, config: AzureDevOpsConfig) {
  return async (args: SearchWorkItemsFilter): Promise<ToolResult> => {
    try {
      const items = await searchWorkItems(client, args, config);
      return {
        content: [{ type: 'text', text: JSON.stringify(items) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  };
}
