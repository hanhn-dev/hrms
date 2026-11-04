import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import type { AzureDevOpsConfig } from '../types.js';
import { getWorkItemStateAges, getWorkItemStateEnteredAt } from '../work-item-state-age.js';

const mockConfig: AzureDevOpsConfig = {
  orgUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  token: 'token',
};

const mockWitApi = {
  getUpdates: vi.fn(),
  getWorkItem: vi.fn(),
};

const mockClient = {
  config: mockConfig,
  getWorkItemTrackingApi: vi.fn().mockResolvedValue(mockWitApi),
} as unknown as AzureDevOpsClient;

describe('getWorkItemStateEnteredAt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the latest System.State change date', async () => {
    mockWitApi.getUpdates.mockResolvedValue([
      {
        rev: 2,
        revisedDate: '2026-01-02T00:00:00Z',
        fields: { 'System.State': { oldValue: 'New', newValue: 'Active' } },
      },
      {
        rev: 3,
        revisedDate: '2026-01-03T00:00:00Z',
        fields: { 'System.Title': { oldValue: 'A', newValue: 'B' } },
      },
      {
        rev: 4,
        revisedDate: '2026-01-05T12:00:00Z',
        fields: { 'System.State': { oldValue: 'Active', newValue: 'In Progress' } },
      },
    ]);

    await expect(getWorkItemStateEnteredAt(mockClient, 10)).resolves.toBe('2026-01-05T12:00:00Z');
    expect(mockWitApi.getWorkItem).not.toHaveBeenCalled();
  });

  it('falls back to ChangedDate then CreatedDate when no state change is found', async () => {
    mockWitApi.getUpdates.mockResolvedValue([
      {
        rev: 2,
        revisedDate: '2026-01-02T00:00:00Z',
        fields: { 'System.Title': { oldValue: 'A', newValue: 'B' } },
      },
    ]);
    mockWitApi.getWorkItem.mockResolvedValue({
      fields: {
        'System.ChangedDate': '2026-01-04T00:00:00Z',
        'System.CreatedDate': '2026-01-01T00:00:00Z',
      },
    });

    await expect(getWorkItemStateEnteredAt(mockClient, 11)).resolves.toBe('2026-01-04T00:00:00Z');
  });

  it('falls back to CreatedDate when ChangedDate is missing', async () => {
    mockWitApi.getUpdates.mockResolvedValue([]);
    mockWitApi.getWorkItem.mockResolvedValue({
      fields: {
        'System.CreatedDate': '2026-01-01T00:00:00Z',
      },
    });

    await expect(getWorkItemStateEnteredAt(mockClient, 12)).resolves.toBe('2026-01-01T00:00:00Z');
  });

  it('wraps Azure DevOps errors from getUpdates', async () => {
    mockWitApi.getUpdates.mockRejectedValue(new Error('boom'));
    await expect(getWorkItemStateEnteredAt(mockClient, 13)).rejects.toThrow('Azure DevOps API error');
  });
});

describe('getWorkItemStateAges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty for an empty id list', async () => {
    await expect(getWorkItemStateAges(mockClient, [])).resolves.toEqual([]);
    expect(mockWitApi.getUpdates).not.toHaveBeenCalled();
  });

  it('dedupes ids and computes daysInState from now', async () => {
    mockWitApi.getUpdates.mockImplementation(async (id: number) => [
      {
        rev: 2,
        revisedDate: id === 1 ? '2026-01-01T00:00:00Z' : '2026-01-08T00:00:00Z',
        fields: { 'System.State': { oldValue: 'New', newValue: 'Active' } },
      },
    ]);

    const result = await getWorkItemStateAges(mockClient, [1, 2, 1], {
      now: new Date('2026-01-10T00:00:00Z'),
      concurrency: 2,
    });

    expect(result).toEqual([
      { workItemId: 1, stateEnteredAt: '2026-01-01T00:00:00Z', daysInState: 9 },
      { workItemId: 2, stateEnteredAt: '2026-01-08T00:00:00Z', daysInState: 2 },
    ]);
  });

  it('runs with bounded concurrency across many ids', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    mockWitApi.getUpdates.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return [
        {
          rev: 1,
          revisedDate: '2026-01-01T00:00:00Z',
          fields: { 'System.State': { oldValue: 'New', newValue: 'Active' } },
        },
      ];
    });

    const ids = Array.from({ length: 20 }, (_, index) => index + 1);
    await getWorkItemStateAges(mockClient, ids, {
      concurrency: 4,
      now: new Date('2026-01-02T00:00:00Z'),
    });

    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(mockWitApi.getUpdates).toHaveBeenCalledTimes(20);
  });
});
