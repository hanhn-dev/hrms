import { AzureDevOpsClient } from '@hrms/azure-devops';
import { readWorkItemImage } from '../work-item-image.js';

export function createWorkItemImageResourceHandler(client: AzureDevOpsClient) {
  return async (uri: URL, variables: Record<string, string | string[] | undefined>) => {
    const rawWorkItemId = variables['id'];
    const workItemId = parseInt(String(rawWorkItemId), 10);
    const attachmentId = getSingleVariable(variables['attachmentId']);

    if (!rawWorkItemId || isNaN(workItemId) || workItemId <= 0) {
      throw new Error(`Invalid work item ID in URI: ${uri.href}`);
    }

    if (!attachmentId) {
      throw new Error(`Invalid attachment ID in URI: ${uri.href}`);
    }

    const image = await readWorkItemImage(client, workItemId, attachmentId);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: image.mimeType,
          blob: image.data.toString('base64'),
        },
      ],
    };
  };
}

function getSingleVariable(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' && value[0].trim().length > 0 ? value[0] : null;
  }

  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}
