import {
  WorkItemErrorPolicy,
  WorkItemExpand,
  type WorkItem as AzureWorkItem,
  type WorkItemRelation,
} from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import {
  classifyWorkItemLookupError,
  getAzureDevOpsErrorMessage,
  type AzureDevOpsClient,
} from './client.js';
import { htmlToMarkdown } from './html-to-text.js';
import type {
  AzureDevOpsConfig,
  ListWorkItemsFilter,
  MultiWorkItemRequest,
  WorkItem,
  WorkItemAttachment,
  WorkItemBatchResult,
  WorkItemBatchResultEntry,
  WorkItemBatchResultStatus,
  WorkItemRequestEntry,
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
const MAX_WORK_ITEM_BATCH_SIZE = 25;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

function escapeWiqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function parsePositiveInteger(value: string): number | null {
  if (!POSITIVE_INTEGER_PATTERN.test(value)) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

function buildInvalidWorkItemIdMessage(value: string): string {
  return `Invalid work item ID: ${value.length > 0 ? value : '<empty>'}`;
}

function buildLookupIssueMessage(id: number, status: Exclude<WorkItemBatchResultStatus, 'found' | 'invalid'>): string {
  if (status === 'inaccessible') {
    return `Work item ${id} is inaccessible with current credentials`;
  }

  return `Work item ${id} not found`;
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

export function parseWorkItemIdsInput(rawIds: string): MultiWorkItemRequest {
  if (rawIds.trim().length === 0) {
    throw new Error('Provide at least one work item ID');
  }

  const rawEntries = rawIds.split(',');
  if (rawEntries.length > MAX_WORK_ITEM_BATCH_SIZE) {
    throw new Error(`A maximum of ${MAX_WORK_ITEM_BATCH_SIZE} work item IDs is supported per request`);
  }

  const entries: WorkItemRequestEntry[] = rawEntries.map((rawValue, index) => {
    const normalizedValue = rawValue.trim();

    return {
      index,
      rawValue,
      normalizedValue,
      parsedId: parsePositiveInteger(normalizedValue),
    };
  });

  const validUniqueIds = Array.from(
    new Set(entries.flatMap((entry) => (entry.parsedId === null ? [] : [entry.parsedId]))),
  );

  return {
    rawIds,
    entries,
    validUniqueIds,
  };
}

async function fetchWorkItemsBatch(client: AzureDevOpsClient, ids: readonly number[]): Promise<Map<number, WorkItem>> {
  const witApi = await client.getWorkItemTrackingApi();

  let rawItems: AzureWorkItem[];
  try {
    // Azure DevOps rejects batch requests that combine `fields` with `$expand`.
    // Requesting relations alone still returns the field payload needed for mapping.
    rawItems = await witApi.getWorkItemsBatch({
      ids: [...ids],
      $expand: WorkItemExpand.Relations,
      errorPolicy: WorkItemErrorPolicy.Omit,
    });
  } catch (error) {
    throw new Error(`Azure DevOps API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const mappedItems = await Promise.all(
    (rawItems ?? [])
      .filter((item): item is AzureWorkItem => item !== null && item !== undefined && typeof item.id === 'number')
      .map(async (rawItem) => mapWorkItem(client, rawItem, client.config.orgUrl)),
  );

  return new Map(mappedItems.map((item) => [item.id, item]));
}

async function resolveOmittedWorkItem(
  client: AzureDevOpsClient,
  id: number,
): Promise<{ status: Exclude<WorkItemBatchResultStatus, 'invalid'>; workItem: WorkItem | null; message: string | null }> {
  const witApi = await client.getWorkItemTrackingApi();

  try {
    const rawItem = await witApi.getWorkItem(id, [...WORK_ITEM_FIELDS], undefined, WorkItemExpand.Relations);

    if (rawItem === null || rawItem === undefined) {
      return {
        status: 'not_found',
        workItem: null,
        message: buildLookupIssueMessage(id, 'not_found'),
      };
    }

    return {
      status: 'found',
      workItem: await mapWorkItem(client, rawItem, client.config.orgUrl),
      message: null,
    };
  } catch (error) {
    const status = classifyWorkItemLookupError(error);
    return {
      status,
      workItem: null,
      message: buildLookupIssueMessage(id, status),
    };
  }
}

export async function getWorkItemsByIds(client: AzureDevOpsClient, rawIds: string): Promise<WorkItemBatchResult> {
  const request = parseWorkItemIdsInput(rawIds);

  let foundItemsById = new Map<number, WorkItem>();
  if (request.validUniqueIds.length > 0) {
    foundItemsById = await fetchWorkItemsBatch(client, request.validUniqueIds);
  }

  const omittedIds = request.validUniqueIds.filter((id) => !foundItemsById.has(id));
  const resolvedOmissions = new Map<
    number,
    { status: Exclude<WorkItemBatchResultStatus, 'invalid'>; workItem: WorkItem | null; message: string | null }
  >();

  if (omittedIds.length > 0) {
    const resolvedEntries = await Promise.all(
      omittedIds.map(async (id) => ({ id, resolution: await resolveOmittedWorkItem(client, id) })),
    );

    for (const { id, resolution } of resolvedEntries) {
      resolvedOmissions.set(id, resolution);
      if (resolution.status === 'found' && resolution.workItem !== null) {
        foundItemsById.set(id, resolution.workItem);
      }
    }
  }

  const results: WorkItemBatchResultEntry[] = request.entries.map((entry) => {
    if (entry.parsedId === null) {
      return {
        index: entry.index,
        input: entry.normalizedValue,
        id: null,
        status: 'invalid',
        workItem: null,
        message: buildInvalidWorkItemIdMessage(entry.normalizedValue),
      };
    }

    const foundItem = foundItemsById.get(entry.parsedId);
    if (foundItem !== undefined) {
      return {
        index: entry.index,
        input: entry.normalizedValue,
        id: entry.parsedId,
        status: 'found',
        workItem: foundItem,
        message: null,
      };
    }

    const omission = resolvedOmissions.get(entry.parsedId);
    return {
      index: entry.index,
      input: entry.normalizedValue,
      id: entry.parsedId,
      status: omission?.status ?? 'not_found',
      workItem: omission?.workItem ?? null,
      message: omission?.message ?? buildLookupIssueMessage(entry.parsedId, 'not_found'),
    };
  });

  const successCount = results.filter((entry) => entry.status === 'found').length;

  return {
    requestedCount: results.length,
    successCount,
    issueCount: results.length - successCount,
    results,
  };
}

export async function getWorkItem(client: AzureDevOpsClient, id: number): Promise<WorkItem> {
  const witApi = await client.getWorkItemTrackingApi();
  let raw: AzureWorkItem | null;
  try {
    raw = await witApi.getWorkItem(id, [...WORK_ITEM_FIELDS], undefined, WorkItemExpand.Relations);
  } catch (error) {
    throw new Error(`Azure DevOps API error: ${getAzureDevOpsErrorMessage(error)}`);
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
