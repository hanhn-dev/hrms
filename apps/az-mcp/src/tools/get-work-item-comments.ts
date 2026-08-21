import { AzureDevOpsClient, getWorkItemComments } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export function createGetWorkItemCommentsHandler(client: AzureDevOpsClient) {
  return async ({ id, top }: { id: number; top?: number }): Promise<ToolResult> => {
    try {
      const comments = await getWorkItemComments(client, id, top);
      return {
        content: [{ type: 'text', text: JSON.stringify(comments) }],
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
