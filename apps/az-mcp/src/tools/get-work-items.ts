import { AzureDevOpsClient, getWorkItemsByIds } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export type GetWorkItemsArgs = {
  ids: string;
};

export function createGetWorkItemsHandler(client: AzureDevOpsClient) {
  return async ({ ids }: GetWorkItemsArgs): Promise<ToolResult> => {
    try {
      const result = await getWorkItemsByIds(client, ids);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
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