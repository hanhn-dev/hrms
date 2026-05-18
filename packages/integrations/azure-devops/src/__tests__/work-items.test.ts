import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WorkItemErrorPolicy,
  WorkItemExpand,
} from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig, ListWorkItemsFilter } from '../types.js';
import { getWorkItem, getWorkItemsByIds, listWorkItems, parseWorkItemIdsInput, queryWorkItems } from '../work-items.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockWitApi = {
  getWorkItem: vi.fn(),
  getWorkItemsBatch: vi.fn(),
  queryByWiql: vi.fn(),
  getWorkItems: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
  getAttachmentMetadata: vi.fn(),
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
  relations: [
    {
      rel: 'AttachedFile',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/image-1?fileName=mockup.png',
      attributes: { name: 'mockup.png', comment: 'Annotated flow' },
    },
    {
      rel: 'AttachedFile',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/doc-1?fileName=notes.pdf',
      attributes: { name: 'notes.pdf' },
    },
    {
      rel: 'System.LinkTypes.Hierarchy-Reverse',
      url: 'https://dev.azure.com/myorg/_apis/wit/workItems/1100',
    },
  ],
};

describe('getWorkItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWitApi.getWorkItem.mockResolvedValue(rawWorkItem);
    vi.mocked(mockClient.getAttachmentMetadata).mockResolvedValue({
      contentType: 'image/png',
      size: 2048,
    });
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

  it('requests relation expansion and maps attached files with image flags', async () => {
    const result = await getWorkItem(mockClient, 1234);

    expect(mockWitApi.getWorkItem).toHaveBeenCalledWith(
      1234,
      expect.any(Array),
      undefined,
      WorkItemExpand.Relations,
    );
    expect(result.attachments).toEqual([
      {
        id: 'image-1',
        name: 'mockup.png',
        url: 'https://dev.azure.com/myorg/_apis/wit/attachments/image-1?fileName=mockup.png',
        comment: 'Annotated flow',
        contentType: 'image/png',
        size: 2048,
        isImage: true,
      },
      {
        id: 'doc-1',
        name: 'notes.pdf',
        url: 'https://dev.azure.com/myorg/_apis/wit/attachments/doc-1?fileName=notes.pdf',
        comment: null,
        contentType: 'image/png',
        size: 2048,
        isImage: false,
      },
    ]);
    expect(mockClient.getAttachmentMetadata).toHaveBeenCalledTimes(2);
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

  it('returns empty attachments when the work item has no attached files', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rawWorkItem,
      relations: undefined,
    });

    const result = await getWorkItem(mockClient, 1234);

    expect(result.attachments).toEqual([]);
    expect(mockClient.getAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('uses the fileName query parameter when attachment name metadata is missing', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rawWorkItem,
      relations: [
        {
          rel: 'AttachedFile',
          url: 'https://dev.azure.com/myorg/_apis/wit/attachments/7f80f78f-5d2c-4a44-b8f0-6bc2087f9e31?fileName=diagram%20v2.png',
          attributes: { comment: 'Latest screen flow' },
        },
      ],
    });

    const result = await getWorkItem(mockClient, 1234);

    expect(result.attachments).toEqual([
      {
        id: '7f80f78f-5d2c-4a44-b8f0-6bc2087f9e31',
        name: 'diagram v2.png',
        url: 'https://dev.azure.com/myorg/_apis/wit/attachments/7f80f78f-5d2c-4a44-b8f0-6bc2087f9e31?fileName=diagram%20v2.png',
        comment: 'Latest screen flow',
        contentType: 'image/png',
        size: 2048,
        isImage: true,
      },
    ]);
  });

  it('prefers Azure-provided attachment content metadata when relation attributes include it', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rawWorkItem,
      relations: [
        {
          rel: 'AttachedFile',
          url: 'https://dev.azure.com/myorg/_apis/wit/attachments/doc-2?fileName=brief.pdf',
          attributes: {
            name: 'brief.pdf',
            contentType: 'application/pdf',
            resourceSize: '4096',
          },
        },
      ],
    });

    const result = await getWorkItem(mockClient, 1234);

    expect(result.attachments).toEqual([
      {
        id: 'doc-2',
        name: 'brief.pdf',
        url: 'https://dev.azure.com/myorg/_apis/wit/attachments/doc-2?fileName=brief.pdf',
        comment: null,
        contentType: 'application/pdf',
        size: 4096,
        isImage: false,
      },
    ]);
    expect(mockClient.getAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('uses Azure-provided attachment IDs when relation attributes include them', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rawWorkItem,
      relations: [
        {
          rel: 'AttachedFile',
          url: 'https://dev.azure.com/myorg/_apis/wit/attachments/generated-id?fileName=wireframe.png',
          attributes: {
            id: 'attachment-guid',
            name: 'wireframe.png',
          },
        },
      ],
    });

    const result = await getWorkItem(mockClient, 1234);

    expect(result.attachments[0]?.id).toBe('attachment-guid');
  });
});

describe('parseWorkItemIdsInput', () => {
  it('trims whitespace and deduplicates valid transport IDs', () => {
    const result = parseWorkItemIdsInput('1, 2,2, 3');

    expect(result.entries.map((entry) => entry.normalizedValue)).toEqual(['1', '2', '2', '3']);
    expect(result.entries.map((entry) => entry.parsedId)).toEqual([1, 2, 2, 3]);
    expect(result.validUniqueIds).toEqual([1, 2, 3]);
  });

  it('throws for empty input', () => {
    expect(() => parseWorkItemIdsInput('   ')).toThrow('Provide at least one work item ID');
  });

  it('throws when the request exceeds the 25 ID limit', () => {
    const tooManyIds = Array.from({ length: 26 }, (_, index) => String(index + 1)).join(',');

    expect(() => parseWorkItemIdsInput(tooManyIds)).toThrow(
      'A maximum of 25 work item IDs is supported per request',
    );
  });
});

describe('getWorkItemsByIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockClient.getAttachmentMetadata).mockResolvedValue({
      contentType: 'image/png',
      size: 2048,
    });
  });

  it('returns ordered work items from one Azure DevOps batch request', async () => {
    mockWitApi.getWorkItemsBatch.mockResolvedValue([
      { ...rawWorkItem, id: 4, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 4' } },
      { ...rawWorkItem, id: 2, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 2' } },
      { ...rawWorkItem, id: 1, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 1' } },
      { ...rawWorkItem, id: 3, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 3' } },
    ]);

    const result = await getWorkItemsByIds(mockClient, '1,2, 3,4');

    expect(mockWitApi.getWorkItemsBatch).toHaveBeenCalledWith({
      ids: [1, 2, 3, 4],
      $expand: WorkItemExpand.Relations,
      errorPolicy: WorkItemErrorPolicy.Omit,
    });
    expect(mockWitApi.getWorkItem).not.toHaveBeenCalled();
    expect(result.successCount).toBe(4);
    expect(result.issueCount).toBe(0);
    expect(result.results.map((entry) => entry.workItem?.id ?? entry.id)).toEqual([1, 2, 3, 4]);
  });

  it('fetches duplicate IDs once but returns them in the original order', async () => {
    mockWitApi.getWorkItemsBatch.mockResolvedValue([
      { ...rawWorkItem, id: 2, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 2' } },
      { ...rawWorkItem, id: 1, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 1' } },
    ]);

    const result = await getWorkItemsByIds(mockClient, '2,1,2');
    const passedIds = (mockWitApi.getWorkItemsBatch.mock.calls[0]?.[0] as { ids: number[] }).ids;

    expect(passedIds).toEqual([2, 1]);
    expect(result.results.map((entry) => entry.workItem?.id ?? entry.id)).toEqual([2, 1, 2]);
  });

  it('returns invalid entries without calling Azure when there are no usable IDs', async () => {
    const result = await getWorkItemsByIds(mockClient, 'abc, ');

    expect(mockWitApi.getWorkItemsBatch).not.toHaveBeenCalled();
    expect(result.successCount).toBe(0);
    expect(result.issueCount).toBe(2);
    expect(result.results.map((entry) => entry.status)).toEqual(['invalid', 'invalid']);
    expect(result.results[1]?.message).toContain('<empty>');
  });

  it('classifies omitted IDs as not_found and inaccessible while preserving valid results', async () => {
    mockWitApi.getWorkItemsBatch.mockResolvedValue([
      { ...rawWorkItem, id: 1, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 1' } },
      { ...rawWorkItem, id: 3, fields: { ...rawWorkItem.fields, 'System.Title': 'Story 3' } },
    ]);
    mockWitApi.getWorkItem
      .mockRejectedValueOnce(new Error('TF401232: Work item 9999 does not exist'))
      .mockRejectedValueOnce(new Error('Access denied to work item 7'));

    const result = await getWorkItemsByIds(mockClient, '1,9999,7,3');

    expect(mockWitApi.getWorkItem).toHaveBeenCalledTimes(2);
    expect(result.results.map((entry) => entry.status)).toEqual(['found', 'not_found', 'inaccessible', 'found']);
    expect(result.results[1]?.message).toBe('Work item 9999 not found');
    expect(result.results[2]?.message).toBe('Work item 7 is inaccessible with current credentials');
  });

  it('supports 25 valid IDs in a single batch request', async () => {
    const ids = Array.from({ length: 25 }, (_, index) => index + 1);
    mockWitApi.getWorkItemsBatch.mockResolvedValue(
      ids.map((id) => ({
        ...rawWorkItem,
        id,
        fields: { ...rawWorkItem.fields, 'System.Title': `Story ${id}` },
        relations: undefined,
      })),
    );

    const result = await getWorkItemsByIds(mockClient, ids.join(','));
    const passedIds = (mockWitApi.getWorkItemsBatch.mock.calls[0]?.[0] as { ids: number[] }).ids;

    expect(passedIds).toEqual(ids);
    expect(result.successCount).toBe(25);
    expect(result.issueCount).toBe(0);
    expect(mockWitApi.getWorkItem).not.toHaveBeenCalled();
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
