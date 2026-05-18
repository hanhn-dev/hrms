import {
  WorkItemExpand,
  type WorkItem as AzureWorkItem,
  type WorkItemRelation,
} from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import type { AzureDevOpsClient } from './client.js';
import { htmlToMarkdown } from './html-to-text.js';
import type {
  AzureDevOpsConfig,
  ListWorkItemsFilter,
  WorkItem,
  WorkItemAttachment,
  WorkItemSummary,
} from './types.js';

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

const IMAGE_ATTACHMENT_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'] as const;

function escapeWiqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function getAttachmentName(url: string, attributes: Record<string, unknown> | undefined): string {
  const attributeName = attributes?.['name'];
  if (typeof attributeName === 'string' && attributeName.trim().length > 0) {
    return attributeName.trim();
  }

  try {
    const parsedUrl = new URL(url);
    const queryName = parsedUrl.searchParams.get('fileName');
    if (typeof queryName === 'string' && queryName.trim().length > 0) {
      return queryName.trim();
    }

    const pathnameSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const lastSegment = pathnameSegments[pathnameSegments.length - 1];
    return lastSegment ? decodeURIComponent(lastSegment) : url;
  } catch {
    const queryMatch = url.match(/[?&]fileName=([^&#]+)/i);
    if (queryMatch?.[1]) {
      return decodeURIComponent(queryMatch[1]).trim();
    }

    const pathnameSegments = url.split('/').filter(Boolean);
    const lastSegment = pathnameSegments[pathnameSegments.length - 1];
    return lastSegment ? decodeURIComponent(lastSegment) : url;
  }
}

function getAttachmentId(url: string, attributes: Record<string, unknown> | undefined): string {
  const attributeId = attributes?.['id'];
  if (typeof attributeId === 'string' && attributeId.trim().length > 0) {
    return attributeId.trim();
  }

  try {
    const parsedUrl = new URL(url);
    const pathnameSegments = parsedUrl.pathname.split('/').filter(Boolean);
    const lastSegment = pathnameSegments[pathnameSegments.length - 1];
    return lastSegment ? decodeURIComponent(lastSegment) : url;
  } catch {
    const pathnameSegments = url.split('?')[0]?.split('/').filter(Boolean) ?? [];
    const lastSegment = pathnameSegments[pathnameSegments.length - 1];
    return lastSegment ? decodeURIComponent(lastSegment) : url;
  }
}

function isImageAttachment(name: string): boolean {
  const normalizedName = name.toLowerCase();
  return IMAGE_ATTACHMENT_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

function getStringAttribute(
  attributes: Record<string, unknown> | undefined,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = attributes?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getNumberAttribute(
  attributes: Record<string, unknown> | undefined,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = attributes?.[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedValue = Number.parseInt(value, 10);
      if (Number.isFinite(parsedValue) && parsedValue >= 0) {
        return parsedValue;
      }
    }
  }

  return null;
}

type AttachedFileRelation = WorkItemRelation & {
  rel: 'AttachedFile';
  url: string;
};

function isAttachedFileRelation(relation: WorkItemRelation | undefined | null): relation is AttachedFileRelation {
  return (
    relation !== null &&
    relation !== undefined &&
    relation.rel === 'AttachedFile' &&
    typeof relation.url === 'string' &&
    relation.url.length > 0
  );
}

async function mapAttachments(client: AzureDevOpsClient, raw: AzureWorkItem): Promise<WorkItemAttachment[]> {
  const attachmentRelations = (raw.relations ?? []).filter(isAttachedFileRelation);

  return Promise.all(
    attachmentRelations.map(async (relation) => {
      const attributes = relation.attributes as Record<string, unknown> | undefined;
      const id = getAttachmentId(relation.url, attributes);
      const name = getAttachmentName(relation.url, attributes);
      const comment = attributes?.['comment'];
      const attributeContentType = getStringAttribute(attributes, 'contentType', 'resourceContentType');
      const attributeSize = getNumberAttribute(attributes, 'size', 'resourceSize');
      const fetchedMetadata =
        attributeContentType !== null && attributeSize !== null
          ? { contentType: attributeContentType, size: attributeSize }
          : await client.getAttachmentMetadata(relation.url);

      return {
        id,
        name,
        url: relation.url,
        comment: typeof comment === 'string' && comment.trim().length > 0 ? comment.trim() : null,
        contentType: attributeContentType ?? fetchedMetadata.contentType,
        size: attributeSize ?? fetchedMetadata.size,
        isImage: isImageAttachment(name),
      };
    }),
  );
}

async function mapWorkItem(client: AzureDevOpsClient, raw: AzureWorkItem, orgUrl: string): Promise<WorkItem> {
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
    attachments: await mapAttachments(client, raw),
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
    raw = await witApi.getWorkItem(id, [...WORK_ITEM_FIELDS], undefined, WorkItemExpand.Relations);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Azure DevOps API error: ${message}`);
  }
  if (raw === null || raw === undefined) {
    throw new Error(`Work item ${id} not found`);
  }
  return mapWorkItem(client, raw, client.config.orgUrl);
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
