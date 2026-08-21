import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItemComments: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItemComments } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItemCommentsResponse } from '@hrms/azure-devops';
import { createGetWorkItemCommentsHandler } from '../../tools/get-work-item-comments.js';

const mockClient = {} as AzureDevOpsClient;

const mockComments: WorkItemCommentsResponse = {
  workItemId: 1234,
  totalCount: 1,
  hasMore: false,
  comments: [
    {
      id: 1,
      author: 'QA',
      createdDate: '2026-08-20T10:00:00Z',
      text: 'Please check staging',
    },
  ],
};

describe('az_get_work_item_comments tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns serialised comments for a valid ID', async () => {
    vi.mocked(getWorkItemComments).mockResolvedValue(mockComments);
    const handler = createGetWorkItemCommentsHandler(mockClient);
    const result = await handler({ id: 1234, top: 20 });

    expect(result.isError).toBeFalsy();
    expect(getWorkItemComments).toHaveBeenCalledWith(mockClient, 1234, 20);
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemCommentsResponse;
    expect(parsed.comments[0]?.text).toBe('Please check staging');
  });

  it('returns isError when comments cannot be loaded', async () => {
    vi.mocked(getWorkItemComments).mockRejectedValue(new Error('Work item 9 not found'));
    const handler = createGetWorkItemCommentsHandler(mockClient);
    const result = await handler({ id: 9 });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Work item 9 not found');
  });
});
