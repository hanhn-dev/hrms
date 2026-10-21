import { TreeStructureGroup, type WorkItemClassificationNode } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { getAzureDevOpsErrorMessage, type AzureDevOpsClient } from './client.js';
import type { AreaModule, ProjectTeam, TeamMember } from './types.js';

const AREA_DEPTH = 10;

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
    teams = await coreApi.getTeams(project);
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

export async function listTeamMembers(client: AzureDevOpsClient): Promise<TeamMember[]> {
  const project = client.teamContext.project;
  const team = client.teamContext.team;
  if (typeof project !== 'string' || project.length === 0 || typeof team !== 'string' || team.length === 0) {
    throw new Error('Azure DevOps team context is missing a project or team');
  }

  const coreApi = await client.getCoreApi();
  let members;
  try {
    members = await coreApi.getTeamMembersWithExtendedProperties(project, team);
  } catch (error) {
    throw new Error(`Azure DevOps core API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const byId = new Map<string, TeamMember>();
  for (const member of members ?? []) {
    const id = member.identity?.id?.trim();
    const displayName = member.identity?.displayName?.trim();
    if (!id || !displayName) {
      continue;
    }
    byId.set(id, { id, displayName });
  }

  return [...byId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function listAreaModules(client: AzureDevOpsClient): Promise<AreaModule[]> {
  const project = client.config.project;
  const witApi = await client.getWorkItemTrackingApi();

  let root: WorkItemClassificationNode;
  try {
    root = await witApi.getClassificationNode(project, TreeStructureGroup.Areas, undefined, AREA_DEPTH);
  } catch (error) {
    throw new Error(`Azure DevOps area path error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const modules: AreaModule[] = [];
  flattenAreaNodes(root, project, modules, true);
  return modules.sort((left, right) => left.path.localeCompare(right.path));
}
