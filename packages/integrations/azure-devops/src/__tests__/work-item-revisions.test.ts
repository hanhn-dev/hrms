import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import { getWorkItemFieldRevisions } from '../work-item-revisions.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockWitApi = {
  getUpdates: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
} as unknown as AzureDevOpsClient;

describe('getWorkItemFieldRevisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps Description and Acceptance Criteria updates (positive)', async () => {
    mockWitApi.getUpdates.mockResolvedValue([
      {
        rev: 4,
        revisedDate: '2026-01-10T00:00:00Z',
        revisedBy: { displayName: 'Pat' },
        fields: {
          'System.Description': { oldValue: '<p>Old goal</p>', newValue: '<p>New goal</p>' },
        },
      },
      {
        rev: 5,
        revisedDate: '2026-01-11T00:00:00Z',
        revisedBy: { displayName: 'Pat' },
        fields: {
          'Microsoft.VSTS.Common.AcceptanceCriteria': {
            oldValue: '<ul><li>Old AC</li></ul>',
            newValue: '<ul><li>New AC</li></ul>',
          },
        },
      },
    ]);

    const result = await getWorkItemFieldRevisions(mockClient, 1234);

    expect(result.workItemId).toBe(1234);
    expect(result.revisions).toEqual([
      {
        revision: 4,
        changedDate: '2026-01-10T00:00:00Z',
        changedBy: 'Pat',
        field: 'description',
        oldMarkdown: 'Old goal',
        newMarkdown: 'New goal',
      },
      {
        revision: 5,
        changedDate: '2026-01-11T00:00:00Z',
        changedBy: 'Pat',
        field: 'acceptanceCriteria',
        oldMarkdown: expect.stringMatching(/Old AC/),
        newMarkdown: expect.stringMatching(/New AC/),
      },
    ]);
  });

  it('drops state-only updates (negative)', async () => {
    mockWitApi.getUpdates.mockResolvedValue([
      {
        rev: 3,
        revisedDate: '2026-01-09T00:00:00Z',
        revisedBy: { displayName: 'Pat' },
        fields: {
          'System.State': { oldValue: 'New', newValue: 'Active' },
        },
      },
    ]);

    const result = await getWorkItemFieldRevisions(mockClient, 1234);

    expect(result.revisions).toEqual([]);
  });

  it('clamps top and treats missing field values as empty markdown (edge)', async () => {
    mockWitApi.getUpdates.mockResolvedValue([
      {
        rev: 6,
        fields: {
          'System.Description': { newValue: '<p>Only new</p>' },
        },
      },
    ]);

    await getWorkItemFieldRevisions(mockClient, 1234, { top: 99 });

    expect(mockWitApi.getUpdates).toHaveBeenCalledWith(1234, 50, 0, 'MyProject');
    const result = await getWorkItemFieldRevisions(mockClient, 1234, { top: 1 });
    expect(result.revisions[0]).toMatchObject({
      field: 'description',
      oldMarkdown: '',
      newMarkdown: 'Only new',
    });
  });

  it('wraps Azure DevOps errors', async () => {
    mockWitApi.getUpdates.mockRejectedValue(new Error('boom'));
    await expect(getWorkItemFieldRevisions(mockClient, 1234)).rejects.toThrow('Azure DevOps API error');
  });
});
