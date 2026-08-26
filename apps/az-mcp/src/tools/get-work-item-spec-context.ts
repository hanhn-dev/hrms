import { AzureDevOpsClient, getWorkItemSpecContext } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export function createGetWorkItemSpecContextHandler(client: AzureDevOpsClient) {
  return async ({ id, commentTop }: { id: number; commentTop?: number }): Promise<ToolResult> => {
    try {
      const context = await getWorkItemSpecContext(client, id, { commentTop });
      return {
        content: [{ type: 'text', text: JSON.stringify(context) }],
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
