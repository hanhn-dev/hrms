import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItemHierarchyContext: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItemHierarchyContext } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItemHierarchyContextResponse } from '@hrms/azure-devops';
import { createGetWorkItemHierarchyContextHandler } from '../../tools/get-work-item-hierarchy-context.js';

const mockClient = {} as AzureDevOpsClient;

const mockResponse: WorkItemHierarchyContextResponse = {
  rootWorkItemId: 135898,
  includedWorkItemCount: 2,
  omittedCount: 0,
  items: [
    {
      workItemId: 135898,
      depth: 0,
      relationToRoot: 'root',
      title: 'Parent story',
      type: 'User Story',
      state: 'Active',
      parentId: null,
      url: 'https://dev.azure.com/example/_workitems/edit/135898',
      description: 'Some description',
      acceptanceCriteria: '- Done',
      missing: { description: false, acceptanceCriteria: false, imageAttachments: true },
      imageAttachments: [],
    },
    {
      workItemId: 135899,
      depth: 1,
      relationToRoot: 'descendant',
      title: 'Child task',
      type: 'Task',
      state: 'Done',
      parentId: 135898,
      url: 'https://dev.azure.com/example/_workitems/edit/135899',
      description: null,
      acceptanceCriteria: null,
      missing: { description: true, acceptanceCriteria: true, imageAttachments: true },
      imageAttachments: [],
    },
  ],
  omissions: [],
};

describe('az_get_work_item_hierarchy_context tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // T025: successful call returns WorkItemHierarchyContextResponse in content[0].text
  it('serialises the WorkItemHierarchyContextResponse into content[0].text without isError', async () => {
    vi.mocked(getWorkItemHierarchyContext).mockResolvedValue(mockResponse);
    const handler = createGetWorkItemHierarchyContextHandler(mockClient);
    const result = await handler({ id: 135898 });

    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemHierarchyContextResponse;
    expect(parsed.rootWorkItemId).toBe(135898);
    expect(parsed.includedWorkItemCount).toBe(2);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]!.relationToRoot).toBe('root');
    expect(parsed.items[1]!.relationToRoot).toBe('descendant');
  });

  // T026: error path returns isError: true with the error message
  it('returns isError: true with the error message when getWorkItemHierarchyContext throws', async () => {
    vi.mocked(getWorkItemHierarchyContext).mockRejectedValue(new Error('Work item 9999 not found'));
    const handler = createGetWorkItemHierarchyContextHandler(mockClient);
    const result = await handler({ id: 9999 });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Work item 9999 not found');
  });
});
