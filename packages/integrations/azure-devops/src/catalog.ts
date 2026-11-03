import { TreeStructureGroup, type WorkItemClassificationNode } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import {
  getAzureDevOpsErrorMessage,
  withAzureDevOpsTimeout,
  type AzureDevOpsClient,
} from './client.js';
import { getOrganizationIdentity } from './organization.js';
import type { AreaModule, ProjectTeam, TeamMember } from './types.js';

const AREA_DEPTH = 10;

/** Graph Users pages can be large; stop after this many pages to keep roster loads bounded. */
const MAX_GRAPH_USER_PAGES = 20;

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

type GraphDescriptorResponse = {
  value?: string;
};

type GraphUsersResponse = {
  value?: readonly {
    originId?: string;
    descriptor?: string;
    displayName?: string;
    principalName?: string;
    mailAddress?: string;
  }[];
};

type IdentitiesResponse = {
  value?: readonly {
    id?: string;
    providerDisplayName?: string;
    customDisplayName?: string;
    displayName?: string;
  }[];
};

function graphUserToMember(user: {
  originId?: string;
  descriptor?: string;
  displayName?: string;
  principalName?: string;
  mailAddress?: string;
}): TeamMember | null {
  const displayName =
    user.displayName?.trim() ||
    user.principalName?.trim() ||
    user.mailAddress?.trim() ||
    '';
  const id = user.originId?.trim() || user.descriptor?.trim() || '';
  if (displayName.length === 0 || id.length === 0) {
    return null;
  }
  return { id, displayName };
}

/**
 * Lists users with access to the configured Azure DevOps project via the Graph
 * Users API (project scope). This includes people who are not on any board team
 * but still have project membership — unlike unioning `getTeamMembers`.
 */
export async function listProjectMembers(client: AzureDevOpsClient): Promise<TeamMember[]> {
  const project = client.config.project;
  if (typeof project !== 'string' || project.length === 0) {
    throw new Error('Azure DevOps config is missing a project');
  }

  const coreApi = await client.getCoreApi();
  let projectId: string | undefined;
  try {
    const projectInfo = await withAzureDevOpsTimeout(coreApi.getProject(project));
    projectId = projectInfo.id?.trim();
  } catch (error) {
    throw new Error(`Azure DevOps core API error: ${getAzureDevOpsErrorMessage(error)}`);
  }
  if (projectId == null || projectId.length === 0) {
    throw new Error(`Azure DevOps project id was not returned for "${project}"`);
  }

  const organization = getOrganizationIdentity(client.config.orgUrl);
  let scopeDescriptor: string;
  try {
    const descriptorUrl = `https://vssps.dev.azure.com/${encodeURIComponent(organization)}/_apis/graph/descriptors/${encodeURIComponent(projectId)}?api-version=7.1-preview.1`;
    const descriptorResult = await withAzureDevOpsTimeout(client.getJson(descriptorUrl));
    const parsed = descriptorResult.data as GraphDescriptorResponse;
    scopeDescriptor = parsed.value?.trim() ?? '';
  } catch (error) {
    throw new Error(`Azure DevOps graph API error: ${getAzureDevOpsErrorMessage(error)}`);
  }
  if (scopeDescriptor.length === 0) {
    throw new Error(`Azure DevOps graph descriptor was not returned for project "${project}"`);
  }

  const byId = new Map<string, TeamMember>();
  let continuationToken: string | null = null;
  for (let page = 0; page < MAX_GRAPH_USER_PAGES; page += 1) {
    const params = new URLSearchParams({
      scopeDescriptor,
      subjectTypes: 'aad,msa,imp',
      'api-version': '7.1-preview.1',
    });
    if (continuationToken != null && continuationToken.length > 0) {
      params.set('continuationToken', continuationToken);
    }
    const usersUrl = `https://vssps.dev.azure.com/${encodeURIComponent(organization)}/_apis/graph/users?${params.toString()}`;
    let pageResult: { data: unknown; headers: Headers };
    try {
      pageResult = await withAzureDevOpsTimeout(client.getJson(usersUrl));
    } catch (error) {
      throw new Error(`Azure DevOps graph API error: ${getAzureDevOpsErrorMessage(error)}`);
    }
    const users = (pageResult.data as GraphUsersResponse).value ?? [];
    for (const user of users) {
      const member = graphUserToMember(user);
      if (member != null) {
        byId.set(member.id, member);
      }
    }
    continuationToken = pageResult.headers.get('x-ms-continuationtoken');
    if (continuationToken == null || continuationToken.length === 0) {
      break;
    }
  }

  return [...byId.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

/**
 * Searches Azure DevOps identities by display name / email (Identity Management
 * Service). Use when a person is not yet in the cached project Graph roster.
 */
export async function searchIdentities(
  client: AzureDevOpsClient,
  query: string,
): Promise<TeamMember[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const organization = getOrganizationIdentity(client.config.orgUrl);
  const params = new URLSearchParams({
    searchFilter: 'General',
    filterValue: trimmed,
    queryMembership: 'None',
    'api-version': '7.1',
  });
  const url = `https://vssps.dev.azure.com/${encodeURIComponent(organization)}/_apis/identities?${params.toString()}`;

  let data: unknown;
  try {
    const result = await withAzureDevOpsTimeout(client.getJson(url));
    data = result.data;
  } catch (error) {
    throw new Error(`Azure DevOps identity API error: ${getAzureDevOpsErrorMessage(error)}`);
  }

  const byId = new Map<string, TeamMember>();
  for (const identity of (data as IdentitiesResponse).value ?? []) {
    const id = identity.id?.trim() ?? '';
    const displayName =
      identity.customDisplayName?.trim() ||
      identity.providerDisplayName?.trim() ||
      identity.displayName?.trim() ||
      '';
    if (id.length === 0 || displayName.length === 0) {
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
