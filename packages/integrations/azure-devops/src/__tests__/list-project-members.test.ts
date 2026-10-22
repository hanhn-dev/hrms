import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import { listProjectMembers } from '../catalog.js';

const mockCoreApi = {
  getTeams: vi.fn(),
  getTeamMembersWithExtendedProperties: vi.fn(),
};

const mockClient = {
  config: { project: 'MyProject', orgUrl: 'https://dev.azure.com/myorg', token: 'token' },
  getCoreApi: vi.fn().mockResolvedValue(mockCoreApi),
} as unknown as AzureDevOpsClient;

describe('listProjectMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unions and dedupes members across project teams', async () => {
    mockCoreApi.getTeams.mockResolvedValue([
      { id: 'team-1', name: 'Alpha Team' },
      { id: 'team-2', name: 'Zebra Team' },
    ]);
    mockCoreApi.getTeamMembersWithExtendedProperties
      .mockResolvedValueOnce([
        { identity: { id: 'user-1', displayName: 'Nakeeb Raut' } },
        { identity: { id: 'user-2', displayName: 'Hanh Nguyen' } },
      ])
      .mockResolvedValueOnce([
        { identity: { id: 'user-1', displayName: 'Nakeeb Raut' } },
        { identity: { id: 'user-3', displayName: 'Alice' } },
        { identity: { id: '  ', displayName: 'Blank id' } },
      ]);

    const result = await listProjectMembers(mockClient);

    expect(mockCoreApi.getTeams).toHaveBeenCalledWith('MyProject');
    expect(mockCoreApi.getTeamMembersWithExtendedProperties).toHaveBeenCalledWith(
      'MyProject',
      'Alpha Team',
    );
    expect(mockCoreApi.getTeamMembersWithExtendedProperties).toHaveBeenCalledWith(
      'MyProject',
      'Zebra Team',
    );
    expect(result).toEqual([
      { id: 'user-3', displayName: 'Alice' },
      { id: 'user-2', displayName: 'Hanh Nguyen' },
      { id: 'user-1', displayName: 'Nakeeb Raut' },
    ]);
  });

  it('wraps Core API member errors with a descriptive prefix', async () => {
    mockCoreApi.getTeams.mockResolvedValue([{ id: 'team-1', name: 'Alpha Team' }]);
    mockCoreApi.getTeamMembersWithExtendedProperties.mockRejectedValue(new Error('boom'));
    await expect(listProjectMembers(mockClient)).rejects.toThrow(
      'Azure DevOps core API error: boom',
    );
  });
});
