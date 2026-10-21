import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeFrame } from 'azure-devops-node-api/interfaces/WorkInterfaces.js';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import { getIterationWorkItems, listTeamIterations } from '../iterations.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockWorkApi = {
  getTeamIterations: vi.fn(),
};

const mockWitApi = {
  queryByWiql: vi.fn(),
  getWorkItems: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  teamContext: { project: 'MyProject', team: 'MyProject Team' },
  getWorkApi: vi.fn().mockResolvedValue(mockWorkApi),
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
} as unknown as AzureDevOpsClient;

describe('listTeamIterations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps and sorts iterations by start date', async () => {
    mockWorkApi.getTeamIterations.mockResolvedValue([
      {
        id: 'iter-2',
        name: 'Sprint 2',
        path: 'MyProject\\Sprint 2',
        attributes: {
          timeFrame: TimeFrame.Future,
          startDate: new Date('2026-02-01T00:00:00Z'),
          finishDate: new Date('2026-02-14T00:00:00Z'),
        },
      },
      {
        id: 'iter-1',
        name: 'Sprint 1',
        path: 'MyProject\\Sprint 1',
        attributes: {
          timeFrame: TimeFrame.Current,
          startDate: new Date('2026-01-01T00:00:00Z'),
          finishDate: new Date('2026-01-14T00:00:00Z'),
        },
      },
    ]);

    const result = await listTeamIterations(mockClient);

    expect(mockWorkApi.getTeamIterations).toHaveBeenCalledWith(mockClient.teamContext, undefined);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('iter-1');
    expect(result[0]!.timeFrame).toBe('current');
    expect(result[0]!.startDate).toBe('2026-01-01T00:00:00.000Z');
    expect(result[1]!.id).toBe('iter-2');
    expect(result[1]!.timeFrame).toBe('future');
  });

  it('passes the timeframe filter through to the Work API', async () => {
    mockWorkApi.getTeamIterations.mockResolvedValue([]);
    await listTeamIterations(mockClient, 'current');
    expect(mockWorkApi.getTeamIterations).toHaveBeenCalledWith(mockClient.teamContext, 'current');
  });

  it('keeps iterations whose start and finish dates are null', async () => {
    mockWorkApi.getTeamIterations.mockResolvedValue([
      {
        id: 'iter-root',
        name: 'MyProject',
        path: 'MyProject',
        attributes: {
          startDate: null,
          finishDate: null,
        },
      },
    ]);

    const result = await listTeamIterations(mockClient);

    expect(result).toEqual([
      {
        id: 'iter-root',
        name: 'MyProject',
        path: 'MyProject',
        timeFrame: null,
        startDate: null,
        finishDate: null,
      },
    ]);
  });

  it('drops iterations missing required identifying fields', async () => {
    mockWorkApi.getTeamIterations.mockResolvedValue([{ id: 'iter-1' }, { name: 'No id' }]);
    const result = await listTeamIterations(mockClient);
    expect(result).toEqual([]);
  });

  it('wraps Work API errors with a descriptive prefix', async () => {
    mockWorkApi.getTeamIterations.mockRejectedValue(new Error('boom'));
    await expect(listTeamIterations(mockClient)).rejects.toThrow('Azure DevOps work API error: boom');
  });
});

describe('getIterationWorkItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWitApi.queryByWiql.mockResolvedValue({ workItems: [{ id: 1 }] });
    mockWitApi.getWorkItems.mockResolvedValue([
      {
        id: 1,
        fields: {
          'System.Title': 'Story A',
          'System.WorkItemType': 'User Story',
          'System.State': 'Active',
          'System.IterationPath': 'MyProject\\Sprint 1',
        },
      },
    ]);
  });

  it('scopes the WIQL lookup to the given iteration path', async () => {
    const result = await getIterationWorkItems(mockClient, 'MyProject\\Sprint 1', mockConfig);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
    expect(result[0]!.iterationPath).toBe('MyProject\\Sprint 1');
    expect(mockWitApi.queryByWiql).toHaveBeenCalledWith(
      { query: expect.stringContaining("[System.IterationPath] UNDER 'MyProject\\Sprint 1'") },
      undefined,
      undefined,
      200,
    );
  });
});
