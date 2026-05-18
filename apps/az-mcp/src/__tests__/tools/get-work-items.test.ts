import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItemsByIds: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItemsByIds } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItem, WorkItemBatchResult } from '@hrms/azure-devops';
import { createGetWorkItemsHandler } from '../../tools/get-work-items.js';

const mockClient = {} as AzureDevOpsClient;

const mockWorkItem: WorkItem = {
  id: 1234,
  title: 'Test Story',
  type: 'User Story',
  state: 'Active',
  description: 'Description text',
  acceptanceCriteria: '- AC 1',
  attachments: [],
  tags: ['auth'],
  assignedTo: 'Jane Smith',
  iterationPath: 'MyProject\\Sprint 1',
  areaPath: 'MyProject',
  parentId: null,
  url: 'https://dev.azure.com/myorg/_workitems/edit/1234',
};

const mockBatchResult: WorkItemBatchResult = {
  requestedCount: 1,
  successCount: 1,
  issueCount: 0,
  results: [
    {
      index: 0,
      input: '1234',
      id: 1234,
      status: 'found',
      workItem: mockWorkItem,
      message: null,
    },
  ],
};

describe('get_work_items tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns serialised WorkItemBatchResult for valid comma-separated IDs', async () => {
    vi.mocked(getWorkItemsByIds).mockResolvedValue(mockBatchResult);
    const handler = createGetWorkItemsHandler(mockClient);
    const result = await handler({ ids: '1234' });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemBatchResult;
    expect(parsed.successCount).toBe(1);
    expect(parsed.results[0]!.status).toBe('found');
    expect(parsed.results[0]!.workItem?.id).toBe(1234);
  });

  it('passes the original ids string through to getWorkItemsByIds', async () => {
    vi.mocked(getWorkItemsByIds).mockResolvedValue(mockBatchResult);
    const handler = createGetWorkItemsHandler(mockClient);

    await handler({ ids: '1,2, 3,4' });

    expect(getWorkItemsByIds).toHaveBeenCalledWith(mockClient, '1,2, 3,4');
  });

  it('returns partial success payloads without converting them into MCP errors', async () => {
    vi.mocked(getWorkItemsByIds).mockResolvedValue({
      requestedCount: 2,
      successCount: 1,
      issueCount: 1,
      results: [
        {
          index: 0,
          input: '1',
          id: 1,
          status: 'found',
          workItem: { ...mockWorkItem, id: 1 },
          message: null,
        },
        {
          index: 1,
          input: 'abc',
          id: null,
          status: 'invalid',
          workItem: null,
          message: 'Invalid work item ID: abc',
        },
      ],
    });

    const handler = createGetWorkItemsHandler(mockClient);
    const result = await handler({ ids: '1,abc' });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemBatchResult;
    expect(parsed.issueCount).toBe(1);
    expect(parsed.results[1]!.status).toBe('invalid');
  });

  it('returns isError: true for validation failures such as empty input', async () => {
    vi.mocked(getWorkItemsByIds).mockRejectedValue(new Error('Provide at least one work item ID'));
    const handler = createGetWorkItemsHandler(mockClient);
    const result = await handler({ ids: '' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Provide at least one work item ID');
  });
});