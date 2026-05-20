import { AzureDevOpsClient, getWorkItemHierarchyContext } from '@hrms/azure-devops';
import type { AzureDevOpsConfig } from '@hrms/azure-devops';

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export function createGetWorkItemHierarchyContextHandler(client: AzureDevOpsClient) {
  return async ({ id }: { id: number }): Promise<ToolResult> => {
    try {
      const response = await getWorkItemHierarchyContext(client, id);
      return {
        content: [{ type: 'text', text: JSON.stringify(response) }],
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
