import { AzureDevOpsClient, getWorkItem } from '@hrms/azure-devops';
import type { AzureDevOpsConfig } from '@hrms/azure-devops';

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export function createGetWorkItemHandler(client: AzureDevOpsClient) {
  return async ({ id }: { id: number }): Promise<ToolResult> => {
    try {
      const workItem = await getWorkItem(client, id);
      return {
        content: [{ type: 'text', text: JSON.stringify(workItem) }],
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

export { AzureDevOpsClient, AzureDevOpsConfig };
