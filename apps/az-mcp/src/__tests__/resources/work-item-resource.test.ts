import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItem: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItem } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItem } from '@hrms/azure-devops';
import { createWorkItemResourceHandler } from '../../resources/work-item-resource.js';

const mockClient = {} as AzureDevOpsClient;

const mockWorkItem: WorkItem = {
  id: 1234,
  title: 'Test Story',
  type: 'User Story',
  state: 'Active',
  description: 'Description text',
  acceptanceCriteria: '-   AC 1\n-   AC 2',
  tags: ['auth', 'ux'],
  assignedTo: 'Jane Smith',
  iterationPath: 'MyProject\\Sprint 1',
  areaPath: 'MyProject',
  parentId: 1100,
  url: 'https://dev.azure.com/myorg/_workitems/edit/1234',
};

describe('work-item resource handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
  });

  it('returns resource contents for a valid work item URI', async () => {
    const handler = createWorkItemResourceHandler(mockClient);
    const uri = new URL('azdo://workitem/1234');
    const result = await handler(uri, { id: '1234' });
    expect(result.contents).toHaveLength(1);
    const content = result.contents[0]!;
    expect(content.uri).toBe('azdo://workitem/1234');
    expect(content.mimeType).toBe('application/json');
    const parsed = JSON.parse(content.text) as WorkItem;
    expect(parsed.id).toBe(1234);
    expect(parsed.title).toBe('Test Story');
    expect(getWorkItem).toHaveBeenCalledWith(mockClient, 1234);
  });

  it('throws when work item does not exist', async () => {
    vi.mocked(getWorkItem).mockRejectedValue(new Error('Work item 9999 not found'));
    const handler = createWorkItemResourceHandler(mockClient);
    const uri = new URL('azdo://workitem/9999');
    await expect(handler(uri, { id: '9999' })).rejects.toThrow('Work item 9999 not found');
  });

  it('throws for a URI with a non-integer ID', async () => {
    const handler = createWorkItemResourceHandler(mockClient);
    const uri = new URL('azdo://workitem/abc');
    await expect(handler(uri, { id: 'abc' })).rejects.toThrow(/Invalid work item ID/);
  });
});
