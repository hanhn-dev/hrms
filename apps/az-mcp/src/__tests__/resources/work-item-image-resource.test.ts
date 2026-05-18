import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItem: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItem } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItem } from '@hrms/azure-devops';
import { createWorkItemImageResourceHandler } from '../../resources/work-item-image-resource.js';

const mockClient = {
  getAttachmentContent: vi.fn(),
} as unknown as AzureDevOpsClient;

const mockWorkItem: WorkItem = {
  id: 1234,
  title: 'Test Story',
  type: 'User Story',
  state: 'Active',
  description: 'Description text',
  acceptanceCriteria: '-   AC 1\n-   AC 2',
  attachments: [
    {
      id: 'img-1',
      name: 'mockup.png',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/img-1?fileName=mockup.png',
      comment: null,
      contentType: 'image/png',
      size: 2048,
      isImage: true,
    },
    {
      id: 'doc-1',
      name: 'notes.pdf',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/doc-1?fileName=notes.pdf',
      comment: null,
      contentType: 'application/pdf',
      size: 4096,
      isImage: false,
    },
  ],
  tags: ['auth', 'ux'],
  assignedTo: 'Jane Smith',
  iterationPath: 'MyProject\\Sprint 1',
  areaPath: 'MyProject',
  parentId: 1100,
  url: 'https://dev.azure.com/myorg/_workitems/edit/1234',
};

describe('work-item image resource handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
    vi.mocked(mockClient.getAttachmentContent).mockResolvedValue(Buffer.from('png-binary'));
  });

  it('returns blob resource contents for a valid image attachment URI', async () => {
    const handler = createWorkItemImageResourceHandler(mockClient);
    const uri = new URL('azdo://workitem/1234/images/img-1');

    const result = await handler(uri, { id: '1234', attachmentId: 'img-1' });

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]).toEqual({
      uri: 'azdo://workitem/1234/images/img-1',
      mimeType: 'image/png',
      blob: Buffer.from('png-binary').toString('base64'),
    });
    expect(getWorkItem).toHaveBeenCalledWith(mockClient, 1234);
    expect(mockClient.getAttachmentContent).toHaveBeenCalledWith(
      'https://dev.azure.com/myorg/_apis/wit/attachments/img-1?fileName=mockup.png',
    );
  });

  it('throws when the attachment does not belong to the work item', async () => {
    const handler = createWorkItemImageResourceHandler(mockClient);
    const uri = new URL('azdo://workitem/1234/images/missing');

    await expect(handler(uri, { id: '1234', attachmentId: 'missing' })).rejects.toThrow(
      'Attachment missing not found on work item 1234',
    );
  });

  it('throws when the attachment is not an image', async () => {
    const handler = createWorkItemImageResourceHandler(mockClient);
    const uri = new URL('azdo://workitem/1234/images/doc-1');

    await expect(handler(uri, { id: '1234', attachmentId: 'doc-1' })).rejects.toThrow(
      'Attachment doc-1 on work item 1234 is not an image',
    );
  });
});