import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CommentExpandOptions,
  CommentFormat,
} from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import { getWorkItemComments } from '../work-item-comments.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockWitApi = {
  getComments: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
} as unknown as AzureDevOpsClient;

describe('getWorkItemComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps markdown comments and omits deleted ones', async () => {
    mockWitApi.getComments.mockResolvedValue({
      totalCount: 3,
      continuationToken: 'next',
      comments: [
        {
          id: 2,
          text: 'Latest note',
          format: CommentFormat.Markdown,
          createdBy: { displayName: 'QA' },
          createdDate: '2026-08-20T10:00:00Z',
          isDeleted: false,
        },
        {
          id: 1,
          text: '<p>Old note</p>',
          format: CommentFormat.Html,
          createdBy: { displayName: 'Dev' },
          createdDate: '2026-08-19T10:00:00Z',
          isDeleted: false,
        },
        {
          id: 99,
          text: 'gone',
          isDeleted: true,
        },
      ],
    });

    const result = await getWorkItemComments(mockClient, 1234, 50);

    expect(mockWitApi.getComments).toHaveBeenCalledWith(
      'MyProject',
      1234,
      50,
      undefined,
      false,
      CommentExpandOptions.RenderedText,
      expect.anything(),
    );
    expect(result.workItemId).toBe(1234);
    expect(result.totalCount).toBe(3);
    expect(result.hasMore).toBe(true);
    expect(result.comments).toEqual([
      {
        id: 2,
        author: 'QA',
        createdDate: '2026-08-20T10:00:00Z',
        text: 'Latest note',
      },
      {
        id: 1,
        author: 'Dev',
        createdDate: '2026-08-19T10:00:00Z',
        text: 'Old note',
      },
    ]);
  });

  it('uses rendered HTML when markdown text is omitted', async () => {
    mockWitApi.getComments.mockResolvedValue({
      totalCount: 1,
      comments: [
        {
          id: 7,
          text: '',
          renderedText: '<p>Verified on staging</p>',
          format: CommentFormat.Markdown,
          createdBy: { displayName: 'QA' },
          createdDate: '2026-10-28T12:48:09Z',
          isDeleted: false,
        },
      ],
    });

    const result = await getWorkItemComments(mockClient, 179243);
    expect(result.comments).toEqual([
      {
        id: 7,
        author: 'QA',
        createdDate: '2026-10-28T12:48:09Z',
        text: 'Verified on staging',
      },
    ]);
  });

  it('sets hasMore false when there is no continuation token', async () => {
    mockWitApi.getComments.mockResolvedValue({
      totalCount: 0,
      comments: [],
    });

    const result = await getWorkItemComments(mockClient, 1234);
    expect(result.hasMore).toBe(false);
    expect(result.comments).toEqual([]);
  });
});
