import type { WorkItemUpdate } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { getAzureDevOpsErrorMessage, type AzureDevOpsClient } from './client.js';
import type { WorkItemStateAge } from './types.js';

const STATE_FIELD = 'System.State';
const UPDATE_PAGE_SIZE = 50;
const UPDATE_SCAN_CAP = 100;
const DEFAULT_CONCURRENCY = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function getWorkItemStateEnteredAt(
  client: AzureDevOpsClient,
  id: number,
): Promise<string | null> {
  const witApi = await client.getWorkItemTrackingApi();
  let lastStateChange: string | null = null;
  let scanned = 0;
  let skip = 0;

  while (scanned < UPDATE_SCAN_CAP) {
    const top = Math.min(UPDATE_PAGE_SIZE, UPDATE_SCAN_CAP - scanned);
    let updates: WorkItemUpdate[];
    try {
      updates = await witApi.getUpdates(id, top, skip, client.config.project);
    } catch (error) {
      throw new Error(`Azure DevOps API error: ${getAzureDevOpsErrorMessage(error)}`);
    }

    const page = updates ?? [];
    if (page.length === 0) {
      break;
    }

    for (const update of page) {
      const fields = update.fields ?? {};
      if (fields[STATE_FIELD] !== undefined) {
        lastStateChange = toIsoDate(update.revisedDate);
      }
    }

    scanned += page.length;
    skip += page.length;
    if (page.length < top) {
      break;
    }
  }

  if (lastStateChange != null) {
    return lastStateChange;
  }

  return readFallbackEnteredAt(client, id);
}

export async function getWorkItemStateAges(
  client: AzureDevOpsClient,
  ids: readonly number[],
  options: { readonly concurrency?: number; readonly now?: Date } = {},
): Promise<readonly WorkItemStateAge[]> {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const concurrency = Math.max(1, Math.min(options.concurrency ?? DEFAULT_CONCURRENCY, uniqueIds.length));
  const now = options.now ?? new Date();
  const results = new Map<number, WorkItemStateAge>();
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < uniqueIds.length) {
      const current = nextIndex;
      nextIndex += 1;
      const id = uniqueIds[current]!;
      const stateEnteredAt = await getWorkItemStateEnteredAt(client, id);
      results.set(id, {
        workItemId: id,
        stateEnteredAt,
        daysInState: daysBetween(stateEnteredAt, now),
      });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return uniqueIds.map((id) => results.get(id)!);
}

async function readFallbackEnteredAt(client: AzureDevOpsClient, id: number): Promise<string | null> {
  const witApi = await client.getWorkItemTrackingApi();
  try {
    const raw = await witApi.getWorkItem(id, ['System.ChangedDate', 'System.CreatedDate'], undefined, undefined);
    const fields = raw?.fields ?? {};
    return toIsoDate(fields['System.ChangedDate']) ?? toIsoDate(fields['System.CreatedDate']);
  } catch (error) {
    throw new Error(`Azure DevOps API error: ${getAzureDevOpsErrorMessage(error)}`);
  }
}

function daysBetween(iso: string | null, now: Date): number | null {
  if (iso == null) {
    return null;
  }
  const entered = new Date(iso);
  if (Number.isNaN(entered.getTime())) {
    return null;
  }
  const diff = now.getTime() - entered.getTime();
  if (diff < 0) {
    return 0;
  }
  return Math.floor(diff / MS_PER_DAY);
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
