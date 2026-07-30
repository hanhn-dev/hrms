import { getPullRequestDetail, type AzureDevOpsClient, type PullRequestDetailRequest } from '@hrms/azure-devops';
import type { ToolResult } from './get-work-item.js';

export function createGetPullRequestHandler(client: AzureDevOpsClient) {
  return async (args: PullRequestDetailRequest): Promise<ToolResult> => {
    try {
      const detail = await getPullRequestDetail(client, {
        pullRequest: args.pullRequest,
        top: args.top,
        skip: args.skip,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(detail) }],
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
