import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  searchWorkItems: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { searchWorkItems } from '@hrms/azure-devops';
import type { AzureDevOpsClient, AzureDevOpsConfig, WorkItemSummary } from '@hrms/azure-devops';
import { createSearchWorkItemsHandler } from '../../tools/search-work-items.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockClient = {} as AzureDevOpsClient;

const mockSummaries: WorkItemSummary[] = [
  {
    id: 1,
    title: 'Login bug',
    type: 'Bug',
    state: 'Active',
    assignedTo: 'Jane Smith',
    tags: ['auth'],
    changedDate: '2026-08-01T00:00:00Z',
    iterationPath: 'MyProject\\Sprint 1',
    parentId: null,
    url: 'https://dev.azure.com/myorg/_workitems/edit/1',
  },
];

describe('az_search_work_items tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchWorkItems).mockResolvedValue(mockSummaries);
  });

  it('returns serialised summaries for structured filters', async () => {
    const handler = createSearchWorkItemsHandler(mockClient, mockConfig);
    const result = await handler({ titleContains: 'Login', type: 'Bug' });

    expect(result.isError).toBeFalsy();
    expect(searchWorkItems).toHaveBeenCalledWith(mockClient, { titleContains: 'Login', type: 'Bug' }, mockConfig);
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemSummary[];
    expect(parsed[0]?.title).toBe('Login bug');
  });

  it('returns isError when search fails', async () => {
    vi.mocked(searchWorkItems).mockRejectedValue(new Error('WIQL query error: boom'));
    const handler = createSearchWorkItemsHandler(mockClient, mockConfig);
    const result = await handler({ titleContains: 'x' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('WIQL query error');
  });
});
