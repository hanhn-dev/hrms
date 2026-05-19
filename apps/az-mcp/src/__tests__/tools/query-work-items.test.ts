import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  queryWorkItems: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { queryWorkItems } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItemSummary } from '@hrms/azure-devops';
import { createQueryWorkItemsHandler } from '../../tools/query-work-items.js';

const mockClient = {} as AzureDevOpsClient;

const mockSummaries: WorkItemSummary[] = [
  {
    id: 10,
    title: 'Active Task',
    type: 'Task',
    state: 'Active',
    url: 'https://dev.azure.com/myorg/_workitems/edit/10',
  },
];

const VALID_WIQL = "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'";

describe('az_query_work_items tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryWorkItems).mockResolvedValue(mockSummaries);
  });

  it('returns serialised WorkItemSummary[] for a valid WIQL query', async () => {
    const handler = createQueryWorkItemsHandler(mockClient);
    const result = await handler({ wiql: VALID_WIQL });
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemSummary[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.id).toBe(10);
    expect(queryWorkItems).toHaveBeenCalledWith(mockClient, VALID_WIQL, 50);
  });

  it('passes custom top value to queryWorkItems', async () => {
    const handler = createQueryWorkItemsHandler(mockClient);
    await handler({ wiql: VALID_WIQL, top: 25 });
    expect(queryWorkItems).toHaveBeenCalledWith(mockClient, VALID_WIQL, 25);
  });

  it('returns isError: true when queryWorkItems throws a WIQL error', async () => {
    vi.mocked(queryWorkItems).mockRejectedValue(new Error('WIQL query error: Syntax error near FROM'));
    const handler = createQueryWorkItemsHandler(mockClient);
    const result = await handler({ wiql: 'INVALID WIQL' });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('WIQL query error:');
  });
});
