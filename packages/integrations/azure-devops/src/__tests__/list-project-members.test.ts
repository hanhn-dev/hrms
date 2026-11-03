import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import { listProjectMembers, searchIdentities } from '../catalog.js';

const mockCoreApi = {
  getProject: vi.fn(),
};

const mockClient = {
  config: { project: 'MyProject', orgUrl: 'https://dev.azure.com/myorg', token: 'token' },
  getCoreApi: vi.fn().mockResolvedValue(mockCoreApi),
  getJson: vi.fn(),
} as unknown as AzureDevOpsClient;

describe('listProjectMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getCoreApi = vi.fn().mockResolvedValue(mockCoreApi);
  });

  it('loads project-scoped Graph users, not team memberships', async () => {
    mockCoreApi.getProject.mockResolvedValue({ id: 'project-guid' });
    mockClient.getJson = vi
      .fn()
      .mockResolvedValueOnce({
        data: { value: 'scp.project-descriptor' },
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        data: {
          value: [
            {
              originId: 'user-2',
              displayName: 'Hanh Nguyen',
              principalName: 'hanh@example.com',
            },
            {
              originId: 'user-1',
              displayName: 'Chand Basa',
              principalName: 'chand@example.com',
            },
            {
              originId: '  ',
              displayName: 'Blank id',
            },
          ],
        },
        headers: new Headers(),
      });

    const result = await listProjectMembers(mockClient);

    expect(mockCoreApi.getProject).toHaveBeenCalledWith('MyProject');
    expect(mockClient.getJson).toHaveBeenNthCalledWith(
      1,
      'https://vssps.dev.azure.com/myorg/_apis/graph/descriptors/project-guid?api-version=7.1-preview.1',
    );
    expect(String(vi.mocked(mockClient.getJson).mock.calls[1]?.[0])).toContain(
      'scopeDescriptor=scp.project-descriptor',
    );
    expect(String(vi.mocked(mockClient.getJson).mock.calls[1]?.[0])).toContain(
      'subjectTypes=aad%2Cmsa%2Cimp',
    );
    expect(result).toEqual([
      { id: 'user-1', displayName: 'Chand Basa' },
      { id: 'user-2', displayName: 'Hanh Nguyen' },
    ]);
  });

  it('follows Graph continuation tokens across pages', async () => {
    mockCoreApi.getProject.mockResolvedValue({ id: 'project-guid' });
    mockClient.getJson = vi
      .fn()
      .mockResolvedValueOnce({
        data: { value: 'scp.project-descriptor' },
        headers: new Headers(),
      })
      .mockResolvedValueOnce({
        data: { value: [{ originId: 'user-1', displayName: 'Alice' }] },
        headers: new Headers({ 'x-ms-continuationtoken': 'page-2' }),
      })
      .mockResolvedValueOnce({
        data: { value: [{ originId: 'user-2', displayName: 'Bob' }] },
        headers: new Headers(),
      });

    const result = await listProjectMembers(mockClient);
    expect(result.map((member) => member.displayName)).toEqual(['Alice', 'Bob']);
    expect(String(vi.mocked(mockClient.getJson).mock.calls[2]?.[0])).toContain(
      'continuationToken=page-2',
    );
  });

  it('wraps Graph API errors', async () => {
    mockCoreApi.getProject.mockResolvedValue({ id: 'project-guid' });
    mockClient.getJson = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(listProjectMembers(mockClient)).rejects.toThrow(
      'Azure DevOps graph API error: boom',
    );
  });
});

describe('searchIdentities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns nothing for short queries', async () => {
    await expect(searchIdentities(mockClient, 'R')).resolves.toEqual([]);
    expect(mockClient.getJson).not.toHaveBeenCalled();
  });

  it('maps Identity Management search hits', async () => {
    mockClient.getJson = vi.fn().mockResolvedValue({
      data: {
        value: [
          { id: 'id-1', providerDisplayName: 'Rajat Kumar', customDisplayName: 'Rajat' },
          { id: 'id-2', displayName: 'Chand Basa' },
        ],
      },
      headers: new Headers(),
    });

    const result = await searchIdentities(mockClient, 'Rajat');
    expect(String(vi.mocked(mockClient.getJson).mock.calls[0]?.[0])).toContain(
      'filterValue=Rajat',
    );
    expect(result).toEqual([
      { id: 'id-2', displayName: 'Chand Basa' },
      { id: 'id-1', displayName: 'Rajat' },
    ]);
  });
});
