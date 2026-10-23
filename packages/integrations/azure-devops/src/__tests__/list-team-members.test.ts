import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import { listTeamMembers } from '../catalog.js';

const mockCoreApi = {
  getTeamMembersWithExtendedProperties: vi.fn(),
};

const mockClient = {
  teamContext: { project: 'MyProject', team: 'MyProject Team' },
  getCoreApi: vi.fn().mockResolvedValue(mockCoreApi),
} as unknown as AzureDevOpsClient;

describe('listTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getCoreApi = vi.fn().mockResolvedValue(mockCoreApi);
  });

  it('uses the configured team when no team is passed', async () => {
    mockCoreApi.getTeamMembersWithExtendedProperties.mockResolvedValue([
      { identity: { id: 'user-2', displayName: 'Nakeeb Raut' } },
      { identity: { id: 'user-1', displayName: 'Hanh Nguyen' } },
    ]);

    const result = await listTeamMembers(mockClient);

    expect(mockCoreApi.getTeamMembersWithExtendedProperties).toHaveBeenCalledWith(
      'MyProject',
      'MyProject Team',
    );
    expect(result).toEqual([
      { id: 'user-1', displayName: 'Hanh Nguyen' },
      { id: 'user-2', displayName: 'Nakeeb Raut' },
    ]);
  });

  it('uses a trimmed team override', async () => {
    mockCoreApi.getTeamMembersWithExtendedProperties.mockResolvedValue([]);

    await listTeamMembers(mockClient, '  Team Sprinter  ');

    expect(mockCoreApi.getTeamMembersWithExtendedProperties).toHaveBeenCalledWith(
      'MyProject',
      'Team Sprinter',
    );
  });

  it('falls back to the configured team when the override is blank', async () => {
    mockCoreApi.getTeamMembersWithExtendedProperties.mockResolvedValue([]);

    await listTeamMembers(mockClient, '   ');

    expect(mockCoreApi.getTeamMembersWithExtendedProperties).toHaveBeenCalledWith(
      'MyProject',
      'MyProject Team',
    );
  });

  it('wraps Core API errors', async () => {
    mockCoreApi.getTeamMembersWithExtendedProperties.mockRejectedValue(new Error('boom'));

    await expect(listTeamMembers(mockClient, 'Team Sprinter')).rejects.toThrow(
      'Azure DevOps core API error: boom',
    );
  });
});
