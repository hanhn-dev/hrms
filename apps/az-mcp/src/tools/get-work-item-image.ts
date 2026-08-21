import { AzureDevOpsClient } from '@hrms/azure-devops';
import { readWorkItemImage } from '../work-item-image.js';

type ImageToolResult = {
  content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>;
  isError?: boolean;
};

export function createGetWorkItemImageHandler(client: AzureDevOpsClient) {
  return async ({ id, attachmentId }: { id: number; attachmentId: string }): Promise<ImageToolResult> => {
    try {
      const image = await readWorkItemImage(client, id, attachmentId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              workItemId: image.workItemId,
              attachmentId: image.attachmentId,
              name: image.name,
              mimeType: image.mimeType,
              size: image.size,
            }),
          },
          {
            type: 'image',
            data: image.data.toString('base64'),
            mimeType: image.mimeType,
          },
        ],
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
