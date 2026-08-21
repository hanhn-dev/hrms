import { AzureDevOpsClient, getWorkItem } from '@hrms/azure-devops';
import type { WorkItemAttachment } from '@hrms/azure-devops';

export const MAX_WORK_ITEM_IMAGE_BYTES = 5_000_000;

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

export type WorkItemImage = {
  readonly workItemId: number;
  readonly attachmentId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly data: Buffer;
};

export async function readWorkItemImage(
  client: AzureDevOpsClient,
  workItemId: number,
  attachmentId: string,
): Promise<WorkItemImage> {
  const workItem = await getWorkItem(client, workItemId);
  const attachment = workItem.attachments.find((candidate) => candidate.id === attachmentId);

  if (!attachment) {
    throw new Error(`Attachment ${attachmentId} not found on work item ${workItemId}`);
  }

  if (!attachment.isImage) {
    throw new Error(`Attachment ${attachmentId} on work item ${workItemId} is not an image`);
  }

  if (attachment.size !== null && attachment.size > MAX_WORK_ITEM_IMAGE_BYTES) {
    throw new Error(
      `Attachment ${attachmentId} on work item ${workItemId} exceeds ${MAX_WORK_ITEM_IMAGE_BYTES} bytes`,
    );
  }

  const data = await client.getAttachmentContent(attachment.url);
  if (data.byteLength > MAX_WORK_ITEM_IMAGE_BYTES) {
    throw new Error(
      `Attachment ${attachmentId} on work item ${workItemId} exceeds ${MAX_WORK_ITEM_IMAGE_BYTES} bytes`,
    );
  }

  return {
    workItemId,
    attachmentId,
    name: attachment.name,
    mimeType: resolveMimeType(attachment),
    size: attachment.size ?? data.byteLength,
    data,
  };
}

function resolveMimeType(attachment: WorkItemAttachment): string {
  if (attachment.contentType && attachment.contentType.trim().length > 0) {
    return attachment.contentType;
  }

  const lowerName = attachment.name.toLowerCase();
  const matchingExtension = Object.keys(IMAGE_MIME_TYPES).find((extension) => lowerName.endsWith(extension));
  return matchingExtension ? (IMAGE_MIME_TYPES[matchingExtension] ?? 'application/octet-stream') : 'application/octet-stream';
}
