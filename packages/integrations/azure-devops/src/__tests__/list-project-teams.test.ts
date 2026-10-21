import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import { listProjectTeams } from '../catalog.js';

const mockCoreApi = {
  getTeams: vi.fn(),
};

const mockClient = {
  config: { project: 'MyProject', orgUrl: 'https://dev.azure.com/myorg', token: 'token' },
  getCoreApi: vi.fn().mockResolvedValue(mockCoreApi),
} as unknown as AzureDevOpsClient;

describe('listProjectTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps and sorts teams by name', async () => {
    mockCoreApi.getTeams.mockResolvedValue([
      { id: 'team-2', name: 'Zebra Team' },
      { id: 'team-1', name: 'Alpha Team' },
      { id: '  ', name: 'Blank id' },
      { id: 'team-3', name: '  ' },
    ]);

    const result = await listProjectTeams(mockClient);

    expect(mockCoreApi.getTeams).toHaveBeenCalledWith('MyProject');
    expect(result).toEqual([
      { id: 'team-1', name: 'Alpha Team' },
      { id: 'team-2', name: 'Zebra Team' },
    ]);
  });

  it('wraps Core API errors with a descriptive prefix', async () => {
    mockCoreApi.getTeams.mockRejectedValue(new Error('boom'));
    await expect(listProjectTeams(mockClient)).rejects.toThrow('Azure DevOps core API error: boom');
  });
});
