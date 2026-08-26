import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItemFieldRevisions: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItemFieldRevisions } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItemFieldRevisionsResponse } from '@hrms/azure-devops';
import { createGetWorkItemRevisionsHandler } from '../../tools/get-work-item-revisions.js';

const mockClient = {} as AzureDevOpsClient;

const mockRevisions: WorkItemFieldRevisionsResponse = {
  workItemId: 1234,
  revisions: [
    {
      revision: 4,
      changedDate: '2026-01-10T00:00:00Z',
      changedBy: 'Pat',
      field: 'description',
      oldMarkdown: 'Old',
      newMarkdown: 'New',
    },
  ],
};

describe('az_get_work_item_revisions tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns serialised revisions (positive)', async () => {
    vi.mocked(getWorkItemFieldRevisions).mockResolvedValue(mockRevisions);
    const handler = createGetWorkItemRevisionsHandler(mockClient);
    const result = await handler({ id: 1234, top: 10 });

    expect(result.isError).toBeFalsy();
    expect(getWorkItemFieldRevisions).toHaveBeenCalledWith(mockClient, 1234, { top: 10 });
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemFieldRevisionsResponse;
    expect(parsed.revisions[0]?.field).toBe('description');
  });

  it('returns isError when updates cannot be loaded (negative)', async () => {
    vi.mocked(getWorkItemFieldRevisions).mockRejectedValue(new Error('Work item 9 not found'));
    const handler = createGetWorkItemRevisionsHandler(mockClient);
    const result = await handler({ id: 9 });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Work item 9 not found');
  });

  it('passes undefined top through (edge)', async () => {
    vi.mocked(getWorkItemFieldRevisions).mockResolvedValue({ workItemId: 1234, revisions: [] });
    const handler = createGetWorkItemRevisionsHandler(mockClient);
    await handler({ id: 1234 });
    expect(getWorkItemFieldRevisions).toHaveBeenCalledWith(mockClient, 1234, { top: undefined });
  });
});
