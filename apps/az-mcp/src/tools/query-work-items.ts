import { AzureDevOpsClient, queryWorkItems } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export type QueryWorkItemsArgs = {
  wiql: string;
  top?: number;
};

export function createQueryWorkItemsHandler(client: AzureDevOpsClient) {
  return async ({ wiql, top = 50 }: QueryWorkItemsArgs): Promise<ToolResult> => {
    try {
      const items = await queryWorkItems(client, wiql, top);
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
