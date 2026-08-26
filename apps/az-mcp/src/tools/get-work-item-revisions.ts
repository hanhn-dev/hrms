import { AzureDevOpsClient, getWorkItemFieldRevisions } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export function createGetWorkItemRevisionsHandler(client: AzureDevOpsClient) {
  return async ({ id, top }: { id: number; top?: number }): Promise<ToolResult> => {
    try {
      const revisions = await getWorkItemFieldRevisions(client, id, { top });
      return {
        content: [{ type: 'text', text: JSON.stringify(revisions) }],
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
