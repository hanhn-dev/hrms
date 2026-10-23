import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AzureDevOpsClient } from '../client.js';
import { listTaskboardColumns, listTaskboardWorkItemColumns } from '../taskboard.js';

const mockWorkApi = {
  getColumns: vi.fn(),
  getWorkItemColumns: vi.fn(),
};

const mockClient = {
  teamContext: { project: 'MyProject', team: 'MyProject Team' },
  getWorkApi: vi.fn().mockResolvedValue(mockWorkApi),
} as unknown as AzureDevOpsClient;

describe('listTaskboardColumns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getWorkApi = vi.fn().mockResolvedValue(mockWorkApi);
  });

  it('maps columns, drops invalid rows, and sorts by order', async () => {
    mockWorkApi.getColumns.mockResolvedValue({
      columns: [
        { id: 'col-b', name: 'Doing', order: 2, mappings: [{ workItemType: 'Task', state: 'Active' }, { state: 'New' }] },
        { id: '  ', name: 'Blank' },
        { id: 'col-a', name: 'To Do', order: 0 },
        { id: 'col-c', name: '  ' },
        { name: 'Missing id', order: 1 },
        { id: 'col-d', name: 'Review' },
      ],
    });

    const result = await listTaskboardColumns(mockClient);

    expect(mockWorkApi.getColumns).toHaveBeenCalledWith(mockClient.teamContext);
    expect(result).toEqual([
      { id: 'col-a', name: 'To Do', order: 0, mappings: [] },
      {
        id: 'col-b',
        name: 'Doing',
        order: 2,
        mappings: [{ workItemType: 'Task', state: 'Active' }],
      },
      { id: 'col-d', name: 'Review', order: 5, mappings: [] },
    ]);
  });

  it('uses the team override', async () => {
    mockWorkApi.getColumns.mockResolvedValue({ columns: [] });

    await listTaskboardColumns(mockClient, '  Team Sprinter  ');

    expect(mockWorkApi.getColumns).toHaveBeenCalledWith({
      project: 'MyProject',
      team: 'Team Sprinter',
    });
  });

  it('wraps Work API errors', async () => {
    mockWorkApi.getColumns.mockRejectedValue(new Error('boom'));

    await expect(listTaskboardColumns(mockClient)).rejects.toThrow(
      'Azure DevOps work API error: boom',
    );
  });
});

describe('listTaskboardWorkItemColumns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getWorkApi = vi.fn().mockResolvedValue(mockWorkApi);
  });

  it('maps placements and drops invalid rows', async () => {
    mockWorkApi.getWorkItemColumns.mockResolvedValue([
      { workItemId: 10, columnId: 'col-a' },
      { workItemId: 0, columnId: 'col-a' },
      { workItemId: 11, columnId: '  ' },
      { workItemId: 12.5, columnId: 'col-b' },
      { columnId: 'col-b' },
    ]);

    const result = await listTaskboardWorkItemColumns(mockClient, 'iter-1', 'Team Sprinter');

    expect(mockWorkApi.getWorkItemColumns).toHaveBeenCalledWith(
      { project: 'MyProject', team: 'Team Sprinter' },
      'iter-1',
    );
    expect(result).toEqual([{ workItemId: 10, columnId: 'col-a' }]);
  });

  it('returns no placements when the team has not customized taskboard columns', async () => {
    mockWorkApi.getWorkItemColumns.mockRejectedValue(
      new Error(
        'Taskboard columns are not added. Customize the taskboard columns before accessing it.',
      ),
    );

    const result = await listTaskboardWorkItemColumns(mockClient, 'iter-1');

    expect(result).toEqual([]);
  });

  it('wraps Work API errors', async () => {
    mockWorkApi.getWorkItemColumns.mockRejectedValue(new Error('boom'));

    await expect(listTaskboardWorkItemColumns(mockClient, 'iter-1')).rejects.toThrow(
      'Azure DevOps work API error: boom',
    );
  });
});
