import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentFormat } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import { getWorkItemSpecContext } from '../work-item-spec-context.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockWitApi = {
  getWorkItem: vi.fn(),
  getWorkItemsBatch: vi.fn(),
  getComments: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
  getAttachmentMetadata: vi.fn().mockResolvedValue({ contentType: 'image/png', size: 1024 }),
} as unknown as AzureDevOpsClient;

const rootRaw = {
  id: 1234,
  fields: {
    'System.Title': 'Parent PBI',
    'System.Description':
      '<p>Migrate the username-changed email into React My Details after a successful personal update.</p>',
    'Microsoft.VSTS.Common.AcceptanceCriteria': '<ul><li>Send username email</li></ul>',
    'System.State': 'Active',
    'System.WorkItemType': 'Product Backlog Item',
    'System.Tags': '',
    'System.AssignedTo': null,
    'System.IterationPath': 'Project',
    'System.AreaPath': 'Project',
    'System.Parent': null,
    'System.CreatedDate': '2026-01-01T00:00:00Z',
    'System.ChangedDate': '2026-01-10T00:00:00Z',
  },
  relations: [
    {
      rel: 'System.LinkTypes.Hierarchy-Forward',
      url: 'https://dev.azure.com/myorg/_apis/wit/workItems/2001',
    },
    {
      rel: 'System.LinkTypes.Related',
      url: 'https://dev.azure.com/myorg/_apis/wit/workItems/3001',
    },
    {
      rel: 'AttachedFile',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/img-1?fileName=flow.png',
      attributes: { name: 'flow.png', contentType: 'image/png', size: 1024 },
    },
    {
      rel: 'AttachedFile',
      url: 'https://dev.azure.com/myorg/_apis/wit/attachments/doc-1?fileName=notes.pdf',
      attributes: { name: 'notes.pdf', contentType: 'application/pdf', size: 2048 },
    },
  ],
};

const childRaw = {
  id: 2001,
  fields: {
    'System.Title': 'DEV - Analysis',
    'System.WorkItemType': 'Task',
    'System.State': 'In Progress',
    'Microsoft.VSTS.Common.AcceptanceCriteria': '',
  },
  relations: [],
};

const relatedRaw = {
  id: 3001,
  fields: {
    'System.Title': 'Related story',
    'System.WorkItemType': 'User Story',
    'System.State': 'New',
  },
  relations: [],
};

describe('getWorkItemSpecContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWitApi.getWorkItem.mockResolvedValue(rootRaw);
    mockWitApi.getComments.mockResolvedValue({
      totalCount: 1,
      comments: [
        {
          id: 9,
          text: 'Please update AC-1 after grooming',
          format: CommentFormat.Markdown,
          createdBy: { displayName: 'PO' },
          createdDate: '2026-01-05T00:00:00Z',
          isDeleted: false,
        },
      ],
    });
    mockWitApi.getWorkItemsBatch.mockImplementation(async ({ ids }: { ids: number[] }) =>
      ids.map((id) => {
        if (id === 2001) return childRaw;
        if (id === 3001) return relatedRaw;
        return undefined;
      }).filter(Boolean),
    );
  });

  it('returns root item, comments, child summaries, titled links, and attachment inventory (positive)', async () => {
    const result = await getWorkItemSpecContext(mockClient, 1234);

    expect(result.workItem.id).toBe(1234);
    expect(result.comments.comments[0]?.text).toContain('AC-1');
    expect(result.children).toEqual([
      {
        id: 2001,
        title: 'DEV - Analysis',
        type: 'Task',
        state: 'In Progress',
        hasAcceptanceCriteria: false,
      },
    ]);
    expect(result.links).toEqual([
      {
        kind: 'related',
        rel: 'System.LinkTypes.Related',
        id: 3001,
        url: 'https://dev.azure.com/myorg/_apis/wit/workItems/3001',
        title: 'Related story',
        comment: null,
      },
    ]);
    expect(result.attachments.images.map((attachment) => attachment.name)).toEqual(['flow.png']);
    expect(result.attachments.documents.map((attachment) => attachment.name)).toEqual(['notes.pdf']);
    expect(result.hints).toContain(
      'Call az_get_work_item_revisions with id=1234 to see how Description/AC evolved',
    );
  });

  it('returns empty children when the root has none (negative)', async () => {
    mockWitApi.getWorkItem.mockResolvedValue({
      ...rootRaw,
      relations: rootRaw.relations.filter((relation) => relation.rel !== 'System.LinkTypes.Hierarchy-Forward'),
    });

    const result = await getWorkItemSpecContext(mockClient, 1234);

    expect(result.children).toEqual([]);
  });

  it('omits a child that cannot be fetched (edge)', async () => {
    mockWitApi.getWorkItemsBatch.mockImplementation(async ({ ids }: { ids: number[] }) =>
      ids.flatMap((id) => (id === 3001 ? [relatedRaw] : [])),
    );

    const result = await getWorkItemSpecContext(mockClient, 1234);

    expect(result.children).toEqual([]);
    expect(result.links[0]?.title).toBe('Related story');
  });
});
