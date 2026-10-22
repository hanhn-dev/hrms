import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  createWorkItem: vi.fn(),
  CREATE_WORK_ITEM_DEFAULTS: {
    type: 'Product Backlog Item',
    assignedTo: 'Hanh Nguyen',
    areaPath: 'TDG HRMS\\Employee Management',
    iterationPath: 'TDG HRMS\\Team Sprinter',
  },
  WORK_ITEM_TYPE_OPTIONS: ['Product Backlog Item', 'Bug', 'Task'],
  AzureDevOpsClient: vi.fn(),
}));

import { createWorkItem } from '@hrms/azure-devops';
import type { AzureDevOpsClient, AzureDevOpsConfig, WorkItem } from '@hrms/azure-devops';
import { createCreateWorkItemHandler } from '../../tools/create-work-item.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockClient = {} as AzureDevOpsClient;

const mockWorkItem: WorkItem = {
  id: 9999,
  title: 'DB performance finding',
  type: 'Product Backlog Item',
  state: 'New',
  description: 'Slow query on Employee Search',
  reproSteps: '',
  acceptanceCriteria: '',
  acceptanceCriteriaItems: [],
  inlineImages: [],
  attachments: [],
  tags: [],
  assignedTo: 'Hanh Nguyen',
  iterationPath: 'TDG HRMS\\Team Sprinter',
  areaPath: 'TDG HRMS\\Employee Management',
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
    acceptanceCriteriaEmpty: true,
    acceptanceCriteriaLooksBuriedInDescription: false,
    descriptionThin: false,
    childCount: 0,
    relatedCount: 0,
    imageCount: 0,
    nonImageAttachmentCount: 0,
    acItemCount: 0,
  },
  hints: [],
  url: 'https://dev.azure.com/myorg/_workitems/edit/9999',
};

describe('az_create_work_item tool handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkItem).mockResolvedValue(mockWorkItem);
  });

  it('returns serialised created work item', async () => {
    const handler = createCreateWorkItemHandler(mockClient, mockConfig);
    const result = await handler({
      title: 'DB performance finding',
      description: 'Slow query on Employee Search',
    });

    expect(result.isError).toBeFalsy();
    expect(createWorkItem).toHaveBeenCalledWith(
      mockClient,
      {
        title: 'DB performance finding',
        description: 'Slow query on Employee Search',
        type: undefined,
        assignedTo: undefined,
        areaPath: undefined,
        iterationPath: undefined,
        tags: undefined,
        priority: undefined,
        acceptanceCriteria: undefined,
        parentId: undefined,
        project: undefined,
      },
      mockConfig,
    );
    const parsed = JSON.parse(result.content[0]!.text) as WorkItem;
    expect(parsed.id).toBe(9999);
    expect(parsed.title).toBe('DB performance finding');
  });

  it('returns isError when create fails', async () => {
    vi.mocked(createWorkItem).mockRejectedValue(new Error('Azure DevOps API error: boom'));
    const handler = createCreateWorkItemHandler(mockClient, mockConfig);
    const result = await handler({ title: 'x' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Azure DevOps API error');
  });
});
