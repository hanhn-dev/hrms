import { AzureDevOpsClient, getWorkItem } from '@hrms/azure-devops';

export function createWorkItemResourceHandler(client: AzureDevOpsClient) {
  return async (uri: URL, variables: Record<string, string | string[] | undefined>) => {
    const rawId = variables['id'];
    const id = parseInt(String(rawId), 10);

    if (!rawId || isNaN(id) || id <= 0) {
      throw new Error(`Invalid work item ID in URI: ${uri.href}`);
    }

    const workItem = await getWorkItem(client, id);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(workItem),
        },
      ],
    };
  };
}
