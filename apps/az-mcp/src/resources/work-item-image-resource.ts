import { AzureDevOpsClient, getWorkItem } from '@hrms/azure-devops';

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

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

    const workItem = await getWorkItem(client, workItemId);
    const attachment = workItem.attachments.find((candidate) => candidate.id === attachmentId);

    if (!attachment) {
      throw new Error(`Attachment ${attachmentId} not found on work item ${workItemId}`);
    }

    if (!attachment.isImage) {
      throw new Error(`Attachment ${attachmentId} on work item ${workItemId} is not an image`);
    }

    const binaryContent = await client.getAttachmentContent(attachment.url);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: attachment.contentType ?? getMimeTypeFromName(attachment.name),
          blob: binaryContent.toString('base64'),
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

function getMimeTypeFromName(name: string): string {
  const lowerName = name.toLowerCase();
  const matchingExtension = Object.keys(IMAGE_MIME_TYPES).find((extension) => lowerName.endsWith(extension));
  return matchingExtension ? (IMAGE_MIME_TYPES[matchingExtension] ?? 'application/octet-stream') : 'application/octet-stream';
}