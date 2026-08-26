import type { WorkItemUpdate } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { getAzureDevOpsErrorMessage, type AzureDevOpsClient } from './client.js';
import { htmlToMarkdown } from './html-to-text.js';
import type { WorkItemFieldRevision, WorkItemFieldRevisionsResponse } from './types.js';

const DEFAULT_TOP = 20;
const MAX_TOP = 50;
const DESCRIPTION_FIELD = 'System.Description';
const ACCEPTANCE_CRITERIA_FIELD = 'Microsoft.VSTS.Common.AcceptanceCriteria';

export async function getWorkItemFieldRevisions(
  client: AzureDevOpsClient,
  id: number,
  options: { readonly top?: number } = {},
): Promise<WorkItemFieldRevisionsResponse> {
  const top = Math.min(Math.max(options.top ?? DEFAULT_TOP, 1), MAX_TOP);
  const witApi = await client.getWorkItemTrackingApi();

  let updates: WorkItemUpdate[];
  try {
    updates = await witApi.getUpdates(id, top, 0, client.config.project);
  } catch (error) {
    throw new Error(`Azure DevOps API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const revisions = (updates ?? []).flatMap((update) => mapFieldRevisions(update));

  return {
    workItemId: id,
    revisions,
  };
}

function mapFieldRevisions(update: WorkItemUpdate): WorkItemFieldRevision[] {
  const fields = update.fields ?? {};
  const changedDate = toIsoDate(update.revisedDate);
  const changedBy = update.revisedBy?.displayName ?? null;
  const revision = typeof update.rev === 'number' ? update.rev : null;
  const mapped: WorkItemFieldRevision[] = [];

  if (fields[DESCRIPTION_FIELD] !== undefined) {
    mapped.push({
      revision,
      changedDate,
      changedBy,
      field: 'description',
      oldMarkdown: htmlToMarkdown(asHtml(fields[DESCRIPTION_FIELD]?.oldValue)),
      newMarkdown: htmlToMarkdown(asHtml(fields[DESCRIPTION_FIELD]?.newValue)),
    });
  }

  if (fields[ACCEPTANCE_CRITERIA_FIELD] !== undefined) {
    mapped.push({
      revision,
      changedDate,
      changedBy,
      field: 'acceptanceCriteria',
      oldMarkdown: htmlToMarkdown(asHtml(fields[ACCEPTANCE_CRITERIA_FIELD]?.oldValue)),
      newMarkdown: htmlToMarkdown(asHtml(fields[ACCEPTANCE_CRITERIA_FIELD]?.newValue)),
    });
  }

  return mapped;
}

function asHtml(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}
