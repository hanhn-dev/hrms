import { listPullRequestThreads, type AzureDevOpsClient, type PullRequestThreadsRequest } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export function createListPullRequestThreadsHandler(client: AzureDevOpsClient) {
  return async (args: PullRequestThreadsRequest): Promise<ToolResult> => {
    try {
      const threads = await listPullRequestThreads(client, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(threads) }],
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
