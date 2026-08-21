import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItem: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItem } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItem } from '@hrms/azure-devops';
import { createGetWorkItemImageHandler } from '../../tools/get-work-item-image.js';
import { MAX_WORK_ITEM_IMAGE_BYTES } from '../../work-item-image.js';

const mockClient = {
  getAttachmentContent: vi.fn(),
} as unknown as AzureDevOpsClient;

const mockWorkItem: WorkItem = {
  id: 1234,
  title: 'Bug',
  type: 'Bug',
  state: 'Active',
  description: 'desc',
  reproSteps: 'steps',
  acceptanceCriteria: '',
  attachments: [
    {
      id: 'img-1',
      name: 'shot.png',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/img-1?fileName=shot.png',
      comment: null,
      contentType: 'image/png',
      size: 12,
      isImage: true,
      resourceUri: 'azdo://workitem/1234/images/img-1',
    },
    {
      id: 'doc-1',
      name: 'notes.pdf',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/doc-1',
      comment: null,
      contentType: 'application/pdf',
      size: 100,
      isImage: false,
      resourceUri: null,
    },
    {
      id: 'huge',
      name: 'huge.png',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/huge',
      comment: null,
      contentType: 'image/png',
      size: MAX_WORK_ITEM_IMAGE_BYTES + 1,
      isImage: true,
      resourceUri: 'azdo://workitem/1234/images/huge',
    },
  ],
  tags: [],
  assignedTo: null,
  iterationPath: '',
  areaPath: '',
  parentId: null,
  priority: null,
  severity: null,
  createdDate: null,
  changedDate: null,
  createdBy: null,
  childIds: [],
  relatedWorkItemIds: [],
  hints: [],
  url: 'https://dev.azure.com/myorg/_workitems/edit/1234',
};

describe('az_get_work_item_image tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
    vi.mocked(mockClient.getAttachmentContent).mockResolvedValue(Buffer.from('png-binary'));
  });

  it('returns image content for a valid image attachment', async () => {
    const handler = createGetWorkItemImageHandler(mockClient);
    const result = await handler({ id: 1234, attachmentId: 'img-1' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect(result.content[1]).toEqual({
      type: 'image',
      data: Buffer.from('png-binary').toString('base64'),
      mimeType: 'image/png',
    });
  });

  it('returns isError when the attachment is missing', async () => {
    const handler = createGetWorkItemImageHandler(mockClient);
    const result = await handler({ id: 1234, attachmentId: 'missing' });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('not found') });
  });

  it('returns isError when the attachment is not an image', async () => {
    const handler = createGetWorkItemImageHandler(mockClient);
    const result = await handler({ id: 1234, attachmentId: 'doc-1' });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('is not an image') });
  });

  it('returns isError when the attachment exceeds the size cap', async () => {
    const handler = createGetWorkItemImageHandler(mockClient);
    const result = await handler({ id: 1234, attachmentId: 'huge' });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({ type: 'text', text: expect.stringContaining('exceeds') });
  });
});
