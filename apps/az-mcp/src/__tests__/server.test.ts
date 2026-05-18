import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@hrms/azure-devops', () => ({
  AzureDevOpsClient: vi.fn().mockImplementation(function MockAzureDevOpsClient(config) {
    return {
      config,
      getAttachmentContent: vi.fn().mockResolvedValue(Buffer.from('image-bytes')),
    };
  }),
  getWorkItem: vi.fn(),
  getWorkItemPullRequests: vi.fn(),
  getWorkItemsByIds: vi.fn(),
  listWorkItems: vi.fn(),
  queryWorkItems: vi.fn(),
}));

import { getWorkItem, getWorkItemPullRequests, getWorkItemsByIds } from '@hrms/azure-devops';
import type { AzureDevOpsConfig, PullRequestLookupResponse, WorkItem, WorkItemBatchResult } from '@hrms/azure-devops';
import { createServer } from '../server.js';

const config: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/example',
  project: 'Sample Project',
  token: 'test-pat',
};

const mockWorkItem: WorkItem = {
  id: 135898,
  title: 'Sample work item',
  type: 'Product Backlog Item',
  state: 'Done',
  description: 'Description',
  acceptanceCriteria: 'Acceptance Criteria',
  attachments: [
    {
      id: 'img-1',
      name: 'flow.png',
      url: 'https://dev.azure.com/example/flow.png',
      comment: 'User flow',
      contentType: 'image/png',
      size: 8192,
      isImage: true,
    },
  ],
  tags: [],
  assignedTo: 'Jane Smith',
  iterationPath: 'Project\\Sprint 1',
  areaPath: 'Project',
  parentId: null,
  url: 'https://dev.azure.com/example/_workitems/edit/135898',
};

const mockBatchResult: WorkItemBatchResult = {
  requestedCount: 2,
  successCount: 2,
  issueCount: 0,
  results: [
    {
      index: 0,
      input: '135898',
      id: 135898,
      status: 'found',
      workItem: mockWorkItem,
      message: null,
    },
    {
      index: 1,
      input: '135899',
      id: 135899,
      status: 'found',
      workItem: { ...mockWorkItem, id: 135899, title: 'Second work item' },
      message: null,
    },
  ],
};

const mockPullRequestLookupResponse: PullRequestLookupResponse = {
  stage: 'complete',
  requestedCount: 1,
  candidateTotal: 1,
  matchingTotal: 1,
  issues: [],
  cherryPick: {
    commitHashes: ['merge-501'],
    command: 'git cherry-pick -m 1 merge-501',
    skippedPullRequestIds: [],
  },
  facets: null,
  questions: null,
  results: [
    {
      repositoryId: 'repo-a',
      pullRequestId: 501,
      title: 'PR 501',
      author: 'Alice',
      status: 'completed',
      targetBranch: 'refs/heads/main',
      mergedDate: '2026-05-16T11:20:00Z',
      url: 'https://dev.azure.com/example/project/_git/repo-a/pullrequest/501',
      hashes: {
        mergeCommit: 'merge-501',
        sourceCommit: 'source-501',
        targetCommit: 'target-501',
      },
      relatedWorkItemIds: [101, 202],
      requestedWorkItemIds: [101],
      childWorkItemIds: [202],
    },
  ],
};

async function connectClientAndServer() {
  const server = createServer(config);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    server,
    close: async () => {
      await Promise.all([client.close(), server.close()]);
    },
  };
}

describe('createServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers get_work_item with an id input schema', async () => {
    const session = await connectClientAndServer();

    try {
      const tools = await session.client.listTools();
      const tool = tools.tools.find(({ name }) => name === 'get_work_item');

      expect(tool?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            exclusiveMinimum: 0,
          },
        },
        required: ['id'],
      });
    } finally {
      await session.close();
    }
  });

  it('registers get_work_items with an ids string input schema', async () => {
    const session = await connectClientAndServer();

    try {
      const tools = await session.client.listTools();
      const singleTool = tools.tools.find(({ name }) => name === 'get_work_item');
      const multiTool = tools.tools.find(({ name }) => name === 'get_work_items');

      expect(singleTool).toBeDefined();
      expect(multiTool?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          ids: {
            type: 'string',
            minLength: 1,
          },
        },
        required: ['ids'],
      });
    } finally {
      await session.close();
    }
  });

  it('registers get_work_item_pull_requests with staged refinement inputs', async () => {
    const session = await connectClientAndServer();

    try {
      const tools = await session.client.listTools();
      const tool = tools.tools.find(({ name }) => name === 'get_work_item_pull_requests');

      expect(tool?.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          ids: {
            type: 'string',
            minLength: 1,
          },
          authors: {
            type: 'array',
          },
          targetBranches: {
            type: 'array',
          },
          statuses: {
            type: 'array',
          },
          sortBy: {
            type: 'string',
          },
          sortDirection: {
            type: 'string',
          },
          confirmUnfiltered: {
            type: 'boolean',
          },
        },
        required: ['ids'],
      });
    } finally {
      await session.close();
    }
  });

  it('passes the id argument through to getWorkItem', async () => {
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
    const session = await connectClientAndServer();

    try {
      const result = await session.client.callTool({
        name: 'get_work_item',
        arguments: { id: 135898 },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;

      expect(getWorkItem).toHaveBeenCalledWith(expect.anything(), 135898);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(content[0]!.text)).toMatchObject({ id: 135898 });
    } finally {
      await session.close();
    }
  });

  it('passes the ids argument through to getWorkItemsByIds', async () => {
    vi.mocked(getWorkItemsByIds).mockResolvedValue(mockBatchResult);
    const session = await connectClientAndServer();

    try {
      const result = await session.client.callTool({
        name: 'get_work_items',
        arguments: { ids: '135898, 135899' },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;

      expect(getWorkItemsByIds).toHaveBeenCalledWith(expect.anything(), '135898, 135899');
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(content[0]!.text)).toMatchObject({ successCount: 2 });
    } finally {
      await session.close();
    }
  });

  it('passes staged lookup arguments through to getWorkItemPullRequests', async () => {
    vi.mocked(getWorkItemPullRequests).mockResolvedValue(mockPullRequestLookupResponse);
    const session = await connectClientAndServer();

    try {
      const result = await session.client.callTool({
        name: 'get_work_item_pull_requests',
        arguments: {
          ids: '101,202',
          authors: ['Alice'],
          targetBranches: ['refs/heads/main'],
          statuses: ['completed'],
          sortBy: 'mergedDate',
          sortDirection: 'desc',
          confirmUnfiltered: true,
        },
      });
      const content = result.content as Array<{ type: 'text'; text: string }>;

      expect(getWorkItemPullRequests).toHaveBeenCalledWith(expect.anything(), {
        ids: '101,202',
        authors: ['Alice'],
        targetBranches: ['refs/heads/main'],
        statuses: ['completed'],
        sortBy: 'mergedDate',
        sortDirection: 'desc',
        confirmUnfiltered: true,
      });
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(content[0]!.text)).toMatchObject({ candidateTotal: 1 });
    } finally {
      await session.close();
    }
  });

  it('serves image attachments as blob resources', async () => {
    vi.mocked(getWorkItem).mockResolvedValue(mockWorkItem);
    const session = await connectClientAndServer();

    try {
      const result = await session.client.readResource({
        uri: 'azdo://workitem/135898/images/img-1',
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]).toMatchObject({
        uri: 'azdo://workitem/135898/images/img-1',
        mimeType: 'image/png',
        blob: Buffer.from('image-bytes').toString('base64'),
      });
    } finally {
      await session.close();
    }
  });
});