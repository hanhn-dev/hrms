import { TreeStructureGroup, type WorkItemClassificationNode } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import {
  getAzureDevOpsErrorMessage,
  withAzureDevOpsTimeout,
  type AzureDevOpsClient,
} from './client.js';
import type { AreaModule, ProjectTeam, TeamMember } from './types.js';

const AREA_DEPTH = 10;

/** How many team-member reads may run at once. One-at-a-time kept Git and Pull requests on a skeleton for the whole project. */
const TEAM_MEMBER_CONCURRENCY = 5;

/**
 * Converts a classification-node path (`\Project\Area\Team\Module`) into the
 * area path stored on a work item (`Project\Team\Module`).
 */
export function toWorkItemAreaPath(nodePath: string, project: string): string {
  const trimmed = nodePath.trim().replace(/^\\+/, '');
  const areaRoot = `${project}\\Area`;
  if (trimmed === areaRoot || trimmed === project) {
    return project;
  }

  const areaPrefix = `${areaRoot}\\`;
  if (trimmed.startsWith(areaPrefix)) {
    return `${project}\\${trimmed.slice(areaPrefix.length)}`;
  }

  return trimmed;
}

function flattenAreaNodes(
  node: WorkItemClassificationNode,
  project: string,
  modules: AreaModule[],
  isRoot: boolean,
): void {
  if (!isRoot && typeof node.path === 'string') {
    const path = toWorkItemAreaPath(node.path, project);
    const name =
      typeof node.name === 'string' && node.name.trim().length > 0
        ? node.name.trim()
        : path.split('\\').at(-1) ?? path;
    if (path.length > 0 && path !== project && name.length > 0) {
      modules.push({ name, path });
    }
  }

  for (const child of node.children ?? []) {
    flattenAreaNodes(child, project, modules, false);
  }
}

/**
 * Lists teams in the configured Azure DevOps project (Core API `getTeams`).
 */
export async function listProjectTeams(client: AzureDevOpsClient): Promise<ProjectTeam[]> {
  const project = client.config.project;
  if (typeof project !== 'string' || project.length === 0) {
    throw new Error('Azure DevOps config is missing a project');
  }

  const coreApi = await client.getCoreApi();
  let teams;
  try {
    teams = await withAzureDevOpsTimeout(coreApi.getTeams(project));
  } catch (error) {
    throw new Error(`Azure DevOps core API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const mapped: ProjectTeam[] = [];
  for (const team of teams ?? []) {
    const id = team.id?.trim();
    const name = team.name?.trim();
    if (!id || !name) {
      continue;
    }
    mapped.push({ id, name });
  }

  return mapped.sort((left, right) => left.name.localeCompare(right.name));
}

function mapTeamMembers(
  members: readonly { identity?: { id?: string; displayName?: string } | null }[] | null | undefined,
  byId: Map<string, TeamMember>,
): void {
  for (const member of members ?? []) {
    const id = member.identity?.id?.trim();
    const displayName = member.identity?.displayName?.trim();
    if (!id || !displayName) {
      continue;
    }
    byId.set(id, { id, displayName });
  }
}

export async function listTeamMembers(
  client: AzureDevOpsClient,
  team?: string,
): Promise<TeamMember[]> {
  const project = client.teamContext.project;
  const trimmedTeam = team?.trim();
  const resolvedTeam =
    trimmedTeam && trimmedTeam.length > 0 ? trimmedTeam : client.teamContext.team;
  if (
    typeof project !== 'string' ||
    project.length === 0 ||
    typeof resolvedTeam !== 'string' ||
    resolvedTeam.length === 0
  ) {
    throw new Error('Azure DevOps team context is missing a project or team');
  }

  const coreApi = await client.getCoreApi();
  let members;
  try {
    members = await withAzureDevOpsTimeout(
      coreApi.getTeamMembersWithExtendedProperties(project, resolvedTeam),
    );
  } catch (error) {
    throw new Error(`Azure DevOps core API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const byId = new Map<string, TeamMember>();
  mapTeamMembers(members, byId);
  return [...byId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

/**
 * Lists unique members across every team in the configured Azure DevOps project.
 */
export async function listProjectMembers(client: AzureDevOpsClient): Promise<TeamMember[]> {
  const project = client.config.project;
  if (typeof project !== 'string' || project.length === 0) {
    throw new Error('Azure DevOps config is missing a project');
  }

  const teams = await listProjectTeams(client);
  const coreApi = await client.getCoreApi();
  const byId = new Map<string, TeamMember>();
  const memberLists = await mapWithConcurrency(teams, TEAM_MEMBER_CONCURRENCY, async (team) => {
    try {
      return await withAzureDevOpsTimeout(
        coreApi.getTeamMembersWithExtendedProperties(project, team.name),
      );
    } catch (error) {
      throw new Error(`Azure DevOps core API error: ${getAzureDevOpsErrorMessage(error)}`);
    }
  });

  for (const members of memberLists) {
    mapTeamMembers(members, byId);
  }

  return [...byId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item === undefined) {
        return;
      }
      results[index] = await mapper(item);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function listAreaModules(client: AzureDevOpsClient): Promise<AreaModule[]> {
  const project = client.config.project;
  const witApi = await client.getWorkItemTrackingApi();

  let root: WorkItemClassificationNode;
  try {
    root = await withAzureDevOpsTimeout(
      witApi.getClassificationNode(project, TreeStructureGroup.Areas, undefined, AREA_DEPTH),
    );
  } catch (error) {
    throw new Error(`Azure DevOps area path error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const modules: AreaModule[] = [];
  flattenAreaNodes(root, project, modules, true);
  return modules.sort((left, right) => left.path.localeCompare(right.path));
}
