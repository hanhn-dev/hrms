import { AzureDevOpsClient, listWorkItems } from '@hrms/azure-devops';
import type { AzureDevOpsConfig } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export type ListWorkItemsArgs = {
  project?: string;
  type?: string;
  state?: string;
  iteration?: string;
  top?: number;
};

export function createListWorkItemsHandler(client: AzureDevOpsClient, config: AzureDevOpsConfig) {
  return async (args: ListWorkItemsArgs): Promise<ToolResult> => {
    try {
      const items = await listWorkItems(client, args, config);
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
