import type { WorkItem as AzureWorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { AzureDevOpsClient } from './client.js';
import { htmlToMarkdown } from './html-to-text.js';
import type { AzureDevOpsConfig, ListWorkItemsFilter, WorkItem, WorkItemSummary } from './types.js';

const WORK_ITEM_FIELDS = [
  'System.Title',
  'System.Description',
  'Microsoft.VSTS.Common.AcceptanceCriteria',
  'System.State',
  'System.WorkItemType',
  'System.Tags',
  'System.AssignedTo',
  'System.IterationPath',
  'System.AreaPath',
  'System.Parent',
] as const;

function escapeWiqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function mapWorkItem(raw: AzureWorkItem, orgUrl: string): WorkItem {
  const f = raw.fields ?? {};
  const tagsRaw = (f['System.Tags'] as string | undefined) ?? '';
  const assignedTo = f['System.AssignedTo'] as { displayName?: string } | null | undefined;

  return {
    id: raw.id!,
    title: (f['System.Title'] as string | undefined) ?? '',
    type: (f['System.WorkItemType'] as string | undefined) ?? '',
    state: (f['System.State'] as string | undefined) ?? '',
    description: htmlToMarkdown(f['System.Description'] as string | null | undefined),
    acceptanceCriteria: htmlToMarkdown(
      f['Microsoft.VSTS.Common.AcceptanceCriteria'] as string | null | undefined,
    ),
    tags: tagsRaw ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean) : [],
    assignedTo: assignedTo?.displayName ?? null,
    iterationPath: (f['System.IterationPath'] as string | undefined) ?? '',
    areaPath: (f['System.AreaPath'] as string | undefined) ?? '',
    parentId: (f['System.Parent'] as number | null | undefined) ?? null,
    url: `${orgUrl}/_workitems/edit/${raw.id}`,
  };
}

function mapSummary(raw: AzureWorkItem, orgUrl: string): WorkItemSummary {
  const f = raw.fields ?? {};
  return {
    id: raw.id!,
    title: (f['System.Title'] as string | undefined) ?? '',
    type: (f['System.WorkItemType'] as string | undefined) ?? '',
    state: (f['System.State'] as string | undefined) ?? '',
    url: `${orgUrl}/_workitems/edit/${raw.id}`,
  };
}

export async function getWorkItem(client: AzureDevOpsClient, id: number): Promise<WorkItem> {
  const witApi = await client.getWorkItemTrackingApi();
  let raw: AzureWorkItem | null;
  try {
    raw = await witApi.getWorkItem(id, [...WORK_ITEM_FIELDS]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Azure DevOps API error: ${message}`);
  }
  if (raw === null || raw === undefined) {
    throw new Error(`Work item ${id} not found`);
  }
  return mapWorkItem(raw, client.config.orgUrl);
}

export async function listWorkItems(
  client: AzureDevOpsClient,
  filter: ListWorkItemsFilter,
  config: AzureDevOpsConfig,
): Promise<WorkItemSummary[]> {
  const project = filter.project ?? config.project;
  const top = Math.min(Math.max(filter.top ?? 50, 1), 200);

  const conditions: string[] = [`[System.TeamProject] = '${escapeWiqlString(project)}'`];
  if (filter.type) conditions.push(`[System.WorkItemType] = '${escapeWiqlString(filter.type)}'`);
  if (filter.state) conditions.push(`[System.State] = '${escapeWiqlString(filter.state)}'`);
  if (filter.iteration)
    conditions.push(`[System.IterationPath] UNDER '${escapeWiqlString(filter.iteration)}'`);

  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${conditions.join(' AND ')} ORDER BY [System.ChangedDate] DESC`;
  return queryWorkItems(client, wiql, top);
}

export async function queryWorkItems(
  client: AzureDevOpsClient,
  wiql: string,
  top: number = 50,
): Promise<WorkItemSummary[]> {
  const clampedTop = Math.min(Math.max(top, 1), 200);
  const witApi = await client.getWorkItemTrackingApi();

  let queryResult;
  try {
    queryResult = await witApi.queryByWiql({ query: wiql });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`WIQL query error: ${message}`);
  }

  const ids = (queryResult.workItems ?? [])
    .slice(0, clampedTop)
    .map((wi) => wi.id!)
    .filter((id) => id !== undefined);

  if (ids.length === 0) return [];

  const items = await witApi.getWorkItems(ids, ['System.Title', 'System.WorkItemType', 'System.State']);
  return (items ?? [])
    .filter((item): item is AzureWorkItem => item !== null && item !== undefined)
    .map((item) => mapSummary(item, client.config.orgUrl));
}
