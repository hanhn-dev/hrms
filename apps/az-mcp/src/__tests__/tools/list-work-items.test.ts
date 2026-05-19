import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  listWorkItems: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { listWorkItems } from '@hrms/azure-devops';
import type { AzureDevOpsClient, AzureDevOpsConfig, WorkItemSummary } from '@hrms/azure-devops';
import { createListWorkItemsHandler } from '../../tools/list-work-items.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockClient = {} as AzureDevOpsClient;

const mockSummaries: WorkItemSummary[] = [
  {
    id: 1,
    title: 'Story A',
    type: 'User Story',
    state: 'Active',
    url: 'https://dev.azure.com/myorg/_workitems/edit/1',
  },
  {
    id: 2,
    title: 'Bug B',
    type: 'Bug',
    state: 'New',
    url: 'https://dev.azure.com/myorg/_workitems/edit/2',
  },
];

describe('az_list_work_items tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listWorkItems).mockResolvedValue(mockSummaries);
  });

  it('returns serialised WorkItemSummary[] when filters are provided', async () => {
    const handler = createListWorkItemsHandler(mockClient, mockConfig);
    const result = await handler({ type: 'User Story', state: 'Active' });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemSummary[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0]!.id).toBe(1);
    expect(parsed[0]!.title).toBe('Story A');
  });

  it('passes config project to listWorkItems when no project filter given', async () => {
    const handler = createListWorkItemsHandler(mockClient, mockConfig);
    await handler({});
    expect(listWorkItems).toHaveBeenCalledWith(mockClient, {}, mockConfig);
  });

  it('returns "[]" when result is empty', async () => {
    vi.mocked(listWorkItems).mockResolvedValue([]);
    const handler = createListWorkItemsHandler(mockClient, mockConfig);
    const result = await handler({});
    expect(result.isError).toBeFalsy();
    expect(result.content[0]!.text).toBe('[]');
  });

  it('returns isError: true when listWorkItems throws', async () => {
    vi.mocked(listWorkItems).mockRejectedValue(new Error('API connection failed'));
    const handler = createListWorkItemsHandler(mockClient, mockConfig);
    const result = await handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('API connection failed');
  });
});
