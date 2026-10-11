import { TimeFrame, type TeamSettingsIteration } from 'azure-devops-node-api/interfaces/WorkInterfaces.js';
import { getAzureDevOpsErrorMessage, type AzureDevOpsClient } from './client.js';
import { listWorkItems } from './work-items.js';
import type { AzureDevOpsConfig, TeamIteration, TeamIterationTimeframe, WorkItemSummary } from './types.js';

function toIsoDate(value: Date | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function normalizeTimeFrame(timeFrame: TimeFrame | undefined): TeamIterationTimeframe | null {
  switch (timeFrame) {
    case TimeFrame.Past:
      return 'past';
    case TimeFrame.Current:
      return 'current';
    case TimeFrame.Future:
      return 'future';
    default:
      return null;
  }
}

function mapTeamIteration(iteration: TeamSettingsIteration): TeamIteration | null {
  if (typeof iteration.id !== 'string' || typeof iteration.name !== 'string' || typeof iteration.path !== 'string') {
    return null;
  }

  return {
    id: iteration.id,
    name: iteration.name,
    path: iteration.path,
    timeFrame: normalizeTimeFrame(iteration.attributes?.timeFrame),
    startDate: toIsoDate(iteration.attributes?.startDate),
    finishDate: toIsoDate(iteration.attributes?.finishDate),
  };
}

function sortByStartDate(left: TeamIteration, right: TeamIteration): number {
  const leftValue = left.startDate ?? '';
  const rightValue = right.startDate ?? '';
  return leftValue.localeCompare(rightValue);
}

/**
 * Lists the configured team's sprints (Azure DevOps Team Iterations), including
 * start/finish dates and whether each is past, current, or future.
 */
export async function listTeamIterations(
  client: AzureDevOpsClient,
  timeframe?: TeamIterationTimeframe,
): Promise<TeamIteration[]> {
  const workApi = await client.getWorkApi();

  let rawIterations: TeamSettingsIteration[];
  try {
    rawIterations = await workApi.getTeamIterations(client.teamContext, timeframe);
  } catch (error) {
    throw new Error(`Azure DevOps work API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  return rawIterations
    .map(mapTeamIteration)
    .filter((iteration): iteration is TeamIteration => iteration !== null)
    .sort(sortByStartDate);
}

/**
 * Lists the work items assigned to one sprint (by iteration path). Reuses the
 * existing WIQL-backed `listWorkItems` lookup rather than Azure DevOps' raw
 * iteration-work-item relations API, since the iteration path is all that is
 * needed to scope the query and the result already matches `WorkItemSummary`.
 */
export async function getIterationWorkItems(
  client: AzureDevOpsClient,
  iterationPath: string,
  config: AzureDevOpsConfig,
): Promise<WorkItemSummary[]> {
  return listWorkItems(client, { iteration: iterationPath, top: 200 }, config);
}
