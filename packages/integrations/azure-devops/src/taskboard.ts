import type {
  TaskboardColumn as AzureTaskboardColumn,
  TaskboardWorkItemColumn as AzureTaskboardWorkItemColumn,
} from 'azure-devops-node-api/interfaces/WorkInterfaces.js';
import {
  getAzureDevOpsErrorMessage,
  withAzureDevOpsTimeout,
  type AzureDevOpsClient,
} from './client.js';
import type { TaskboardColumn, TaskboardColumnMapping, TaskboardWorkItemColumn } from './types.js';

function resolveTeamContext(client: AzureDevOpsClient, team?: string) {
  const trimmedTeam = team?.trim();
  return trimmedTeam && trimmedTeam.length > 0
    ? { ...client.teamContext, team: trimmedTeam }
    : client.teamContext;
}

function mapMappings(
  mappings: readonly { workItemType?: string; state?: string }[] | undefined,
): TaskboardColumnMapping[] {
  const mapped: TaskboardColumnMapping[] = [];
  for (const mapping of mappings ?? []) {
    const workItemType = mapping.workItemType?.trim();
    const state = mapping.state?.trim();
    if (!workItemType || !state) {
      continue;
    }
    mapped.push({ workItemType, state });
  }
  return mapped;
}

function mapColumn(column: AzureTaskboardColumn, index: number): TaskboardColumn | null {
  const id = column.id?.trim();
  const name = column.name?.trim();
  if (!id || !name) {
    return null;
  }

  const order =
    typeof column.order === 'number' && Number.isFinite(column.order) ? column.order : index;
  return { id, name, order, mappings: mapMappings(column.mappings) };
}

function mapWorkItemColumn(row: AzureTaskboardWorkItemColumn): TaskboardWorkItemColumn | null {
  const columnId = row.columnId?.trim();
  const workItemId = row.workItemId;
  if (!columnId || typeof workItemId !== 'number' || !Number.isInteger(workItemId) || workItemId <= 0) {
    return null;
  }

  return { workItemId, columnId };
}

/**
 * Lists the team's sprint taskboard columns. When `team` is omitted, uses the
 * client's configured team context.
 */
export async function listTaskboardColumns(
  client: AzureDevOpsClient,
  team?: string,
): Promise<TaskboardColumn[]> {
  const workApi = await client.getWorkApi();
  let raw;
  try {
    raw = await withAzureDevOpsTimeout(workApi.getColumns(resolveTeamContext(client, team)));
  } catch (error) {
    throw new Error(`Azure DevOps work API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  return (raw.columns ?? [])
    .map(mapColumn)
    .filter((column): column is TaskboardColumn => column !== null)
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
}

/**
 * Lists the taskboard column id for each work item on one sprint. When `team`
 * is omitted, uses the client's configured team context.
 */
export async function listTaskboardWorkItemColumns(
  client: AzureDevOpsClient,
  iterationId: string,
  team?: string,
): Promise<TaskboardWorkItemColumn[]> {
  const workApi = await client.getWorkApi();
  let raw: AzureTaskboardWorkItemColumn[];
  try {
    raw = await withAzureDevOpsTimeout(
      workApi.getWorkItemColumns(resolveTeamContext(client, team), iterationId),
    );
  } catch (error) {
    const message = getAzureDevOpsErrorMessage(error);
    // Default taskboards have no per-item column overrides until someone customizes columns.
    if (message.includes('Taskboard columns are not added')) {
      return [];
    }
    throw new Error(`Azure DevOps work API error: ${message}`);
  }

  return (raw ?? [])
    .map(mapWorkItemColumn)
    .filter((row): row is TaskboardWorkItemColumn => row !== null);
}
