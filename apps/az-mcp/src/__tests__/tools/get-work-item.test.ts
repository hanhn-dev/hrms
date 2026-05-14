import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItem: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItem } from '@hrms/azure-devops';
import type { AzureDevOpsClient } from '@hrms/azure-devops';
import type { WorkItem } from '@hrms/azure-devops';
import { createGetWorkItemHandler } from '../../tools/get-work-item.js';

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

describe('get_work_item tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns serialised WorkItem in content[0].text for a valid ID', async () => {
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
    const handler = createGetWorkItemHandler(mockClient);
    const result = await handler({ id: 1234 });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text) as WorkItem;
    expect(parsed.id).toBe(1234);
    expect(parsed.title).toBe('Test Story');
  });

  it('returns isError: true and "Work item not found" for non-existent ID', async () => {
    vi.mocked(getWorkItem).mockRejectedValue(new Error('Work item 9999 not found'));
    const handler = createGetWorkItemHandler(mockClient);
    const result = await handler({ id: 9999 });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Work item 9999 not found');
  });

  it('returns isError: true and auth error message on credential failure', async () => {
    vi.mocked(getWorkItem).mockRejectedValue(new Error('Authentication failed'));
    const handler = createGetWorkItemHandler(mockClient);
    const result = await handler({ id: 1 });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Authentication failed');
  });
});
