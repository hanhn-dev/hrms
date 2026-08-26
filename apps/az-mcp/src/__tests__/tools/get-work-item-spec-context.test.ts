import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  getWorkItemSpecContext: vi.fn(),
  AzureDevOpsClient: vi.fn(),
}));

import { getWorkItemSpecContext } from '@hrms/azure-devops';
import type { AzureDevOpsClient, WorkItemSpecContext } from '@hrms/azure-devops';
import { createGetWorkItemSpecContextHandler } from '../../tools/get-work-item-spec-context.js';

const mockClient = {} as AzureDevOpsClient;

const mockContext: WorkItemSpecContext = {
  workItem: {
    id: 1234,
    title: 'Story',
    type: 'User Story',
    state: 'Active',
    description: 'A description that is long enough not to count as thin text.',
    reproSteps: '',
    acceptanceCriteria: '- Save',
    acceptanceCriteriaItems: [{ id: 'AC-1', text: 'Save', source: 'field', observable: true }],
    inlineImages: [],
    attachments: [],
    tags: [],
    assignedTo: null,
    iterationPath: '',
    areaPath: '',
    parentId: null,
    priority: null,
    severity: null,
    createdDate: null,
    changedDate: null,
    createdBy: null,
    childIds: [],
    relatedWorkItemIds: [],
    links: [],
    coverage: {
      acceptanceCriteriaEmpty: false,
      acceptanceCriteriaLooksBuriedInDescription: false,
      descriptionThin: false,
      childCount: 0,
      relatedCount: 0,
      imageCount: 0,
      nonImageAttachmentCount: 0,
      acItemCount: 1,
    },
    hints: [],
    url: 'https://dev.azure.com/myorg/_workitems/edit/1234',
  },
  comments: { workItemId: 1234, totalCount: 0, hasMore: false, comments: [] },
  children: [],
  links: [],
  attachments: { images: [], documents: [] },
  hints: [],
};

describe('az_get_work_item_spec_context tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns serialised spec context (positive)', async () => {
    vi.mocked(getWorkItemSpecContext).mockResolvedValue(mockContext);
    const handler = createGetWorkItemSpecContextHandler(mockClient);
    const result = await handler({ id: 1234, commentTop: 20 });

    expect(result.isError).toBeFalsy();
    expect(getWorkItemSpecContext).toHaveBeenCalledWith(mockClient, 1234, { commentTop: 20 });
    const parsed = JSON.parse(result.content[0]!.text) as WorkItemSpecContext;
    expect(parsed.workItem.id).toBe(1234);
  });

  it('returns isError when the work item cannot be loaded (negative)', async () => {
    vi.mocked(getWorkItemSpecContext).mockRejectedValue(new Error('Work item 9 not found'));
    const handler = createGetWorkItemSpecContextHandler(mockClient);
    const result = await handler({ id: 9 });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Work item 9 not found');
  });

  it('passes undefined commentTop through (edge)', async () => {
    vi.mocked(getWorkItemSpecContext).mockResolvedValue(mockContext);
    const handler = createGetWorkItemSpecContextHandler(mockClient);
    await handler({ id: 1234 });
    expect(getWorkItemSpecContext).toHaveBeenCalledWith(mockClient, 1234, { commentTop: undefined });
  });
});
