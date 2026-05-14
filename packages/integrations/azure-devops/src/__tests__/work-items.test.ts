import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig, ListWorkItemsFilter } from '../types.js';
import { getWorkItem, listWorkItems, queryWorkItems } from '../work-items.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockWitApi = {
  getWorkItem: vi.fn(),
  queryByWiql: vi.fn(),
  getWorkItems: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
} as unknown as AzureDevOpsClient;

const rawWorkItem = {
  id: 1234,
  fields: {
    'System.Title': 'Test Story',
    'System.Description': '<p>Description text</p>',
    'Microsoft.VSTS.Common.AcceptanceCriteria': '<ul><li>AC 1</li><li>AC 2</li></ul>',
    'System.State': 'Active',
    'System.WorkItemType': 'User Story',
    'System.Tags': 'auth; ux',
    'System.AssignedTo': { displayName: 'Jane Smith' },
    'System.IterationPath': 'MyProject\\Sprint 1',
    'System.AreaPath': 'MyProject',
    'System.Parent': 1100,
  },
};

describe('getWorkItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWitApi.getWorkItem.mockResolvedValue(rawWorkItem);
  });

  it('returns mapped WorkItem with Markdown description', async () => {
    const result = await getWorkItem(mockClient, 1234);
    expect(result.id).toBe(1234);
    expect(result.title).toBe('Test Story');
    expect(result.description).toBe('Description text');
    expect(result.state).toBe('Active');
    expect(result.type).toBe('User Story');
    expect(result.assignedTo).toBe('Jane Smith');
    expect(result.parentId).toBe(1100);
    expect(result.url).toBe('https://dev.azure.com/myorg/_workitems/edit/1234');
  });

  it('converts Acceptance Criteria HTML to Markdown bullets', async () => {
    const result = await getWorkItem(mockClient, 1234);
    expect(result.acceptanceCriteria).toMatch(/^- +AC 1$/m);
    expect(result.acceptanceCriteria).toMatch(/^- +AC 2$/m);
  });

  it('splits tags on semicolon and trims whitespace', async () => {
    const result = await getWorkItem(mockClient, 1234);
    expect(result.tags).toEqual(['auth', 'ux']);
  });

  it('rejects with "Work item {id} not found" when API returns null', async () => {
    mockWitApi.getWorkItem.mockResolvedValue(null);
    await expect(getWorkItem(mockClient, 9999)).rejects.toThrow('Work item 9999 not found');
  });

  it('wraps API errors with a descriptive message', async () => {
    mockWitApi.getWorkItem.mockRejectedValue(new Error('Connection refused'));
    await expect(getWorkItem(mockClient, 1234)).rejects.toThrow('Azure DevOps API error');
  });

  it('wraps non-Error API errors as string', async () => {
    mockWitApi.getWorkItem.mockRejectedValue('string error');
    await expect(getWorkItem(mockClient, 1234)).rejects.toThrow('Azure DevOps API error: string error');
  });

  it('returns empty tags array when tags field is empty', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rawWorkItem,
      fields: { ...rawWorkItem.fields, 'System.Tags': '' },
    });
    const result = await getWorkItem(mockClient, 1234);
    expect(result.tags).toEqual([]);
  });

  it('returns null assignedTo when field is not set', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rawWorkItem,
      fields: { ...rawWorkItem.fields, 'System.AssignedTo': null },
    });
    const result = await getWorkItem(mockClient, 1234);
    expect(result.assignedTo).toBeNull();
  });

  it('returns null parentId when parent field is not set', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rawWorkItem,
      fields: { ...rawWorkItem.fields, 'System.Parent': null },
    });
    const result = await getWorkItem(mockClient, 1234);
    expect(result.parentId).toBeNull();
  });

  it('returns empty strings for undefined optional fields', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      id: 42,
      fields: { 'System.Title': 'Minimal' },
    });
    const result = await getWorkItem(mockClient, 42);
    expect(result.iterationPath).toBe('');
    expect(result.areaPath).toBe('');
    expect(result.type).toBe('');
    expect(result.state).toBe('');
  });
});

describe('listWorkItems', () => {
  const rawSummaryItems = [
    {
      id: 1,
      fields: {
        'System.Title': 'Story A',
        'System.WorkItemType': 'User Story',
        'System.State': 'Active',
      },
    },
    {
      id: 2,
      fields: {
        'System.Title': 'Story B',
        'System.WorkItemType': 'Bug',
        'System.State': 'New',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockWitApi.queryByWiql.mockResolvedValue({ workItems: [{ id: 1 }, { id: 2 }] });
    mockWitApi.getWorkItems.mockResolvedValue(rawSummaryItems);
  });

  it('returns WorkItemSummary[] for a filtered query', async () => {
    const filter: ListWorkItemsFilter = { type: 'User Story', state: 'Active' };
    const result = await listWorkItems(mockClient, filter, mockConfig);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe(1);
    expect(result[0]!.title).toBe('Story A');
  });

  it('includes all filter conditions in the WIQL query', async () => {
    const filter: ListWorkItemsFilter = {
      project: 'OtherProject',
      type: 'Bug',
      state: 'Active',
      iteration: 'Sprint 3',
    };
    await listWorkItems(mockClient, filter, mockConfig);
    const call = mockWitApi.queryByWiql.mock.calls[0];
    const calledWiql: string = (call?.[0] as { query: string }).query;
    expect(calledWiql).toContain("'OtherProject'");
    expect(calledWiql).toContain("'Bug'");
    expect(calledWiql).toContain("'Active'");
    expect(calledWiql).toContain("UNDER 'Sprint 3'");
  });

  it('uses only team project condition when no optional filters provided', async () => {
    await listWorkItems(mockClient, {}, mockConfig);
    const call = mockWitApi.queryByWiql.mock.calls[0];
    const calledWiql: string = (call?.[0] as { query: string }).query;
    expect(calledWiql).toContain('System.TeamProject');
    expect(calledWiql).not.toContain('WorkItemType');
    expect(calledWiql).not.toContain('State');
  });

  it('clamps top to maximum of 200', async () => {
    mockWitApi.queryByWiql.mockResolvedValue({
      workItems: Array.from({ length: 300 }, (_, i) => ({ id: i + 1 })),
    });
    mockWitApi.getWorkItems.mockResolvedValue(rawSummaryItems);
    await listWorkItems(mockClient, { top: 999 }, mockConfig);
    const passedIds = mockWitApi.getWorkItems.mock.calls[0]?.[0] as number[];
    expect(passedIds.length).toBeLessThanOrEqual(200);
  });

  it('returns empty array when query has no results', async () => {
    mockWitApi.queryByWiql.mockResolvedValue({ workItems: [] });
    const result = await listWorkItems(mockClient, {}, mockConfig);
    expect(result).toEqual([]);
    expect(mockWitApi.getWorkItems).not.toHaveBeenCalled();
  });
});

describe('queryWorkItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWitApi.queryByWiql.mockResolvedValue({ workItems: [{ id: 10 }] });
    mockWitApi.getWorkItems.mockResolvedValue([
      { id: 10, fields: { 'System.Title': 'Item', 'System.WorkItemType': 'Task', 'System.State': 'New' } },
    ]);
  });

  it('executes the provided WIQL and returns summaries', async () => {
    const wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'";
    const result = await queryWorkItems(mockClient, wiql, 50);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(10);
    expect(mockWitApi.queryByWiql).toHaveBeenCalledWith({ query: wiql });
  });

  it('propagates WIQL errors with "WIQL query error:" prefix', async () => {
    mockWitApi.queryByWiql.mockRejectedValue(new Error('Syntax error near SELECT'));
    await expect(queryWorkItems(mockClient, 'INVALID', 50)).rejects.toThrow('WIQL query error:');
  });

  it('wraps non-Error WIQL errors as string', async () => {
    mockWitApi.queryByWiql.mockRejectedValue('bad wiql');
    await expect(queryWorkItems(mockClient, 'INVALID', 50)).rejects.toThrow('WIQL query error: bad wiql');
  });

  it('handles undefined workItems in query result', async () => {
    mockWitApi.queryByWiql.mockResolvedValue({});
    const result = await queryWorkItems(mockClient, 'SELECT [System.Id] FROM WorkItems', 50);
    expect(result).toEqual([]);
    expect(mockWitApi.getWorkItems).not.toHaveBeenCalled();
  });

  it('filters out null items from getWorkItems response', async () => {
    mockWitApi.queryByWiql.mockResolvedValue({ workItems: [{ id: 10 }, { id: 11 }] });
    mockWitApi.getWorkItems.mockResolvedValue([
      { id: 10, fields: { 'System.Title': 'Item', 'System.WorkItemType': 'Task', 'System.State': 'New' } },
      null,
    ]);
    const result = await queryWorkItems(mockClient, 'SELECT [System.Id] FROM WorkItems', 50);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(10);
  });

  it('returns empty strings for missing summary fields', async () => {
    mockWitApi.queryByWiql.mockResolvedValue({ workItems: [{ id: 20 }] });
    mockWitApi.getWorkItems.mockResolvedValue([{ id: 20, fields: {} }]);
    const result = await queryWorkItems(mockClient, 'SELECT [System.Id] FROM WorkItems', 50);
    expect(result[0]!.title).toBe('');
    expect(result[0]!.type).toBe('');
    expect(result[0]!.state).toBe('');
  });
});
