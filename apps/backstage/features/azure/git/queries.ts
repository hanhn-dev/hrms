"use server";

import {
  compareGitCommits,
  getGitCommitDetail,
  listGitAuthorActivity,
  listGitBranches,
  listGitCommits,
  listGitRepositories,
  listTeamMembers,
  readGitFilePair,
  searchGitPaths,
  type AzureDevOpsClient,
  type CompareGitCommitsInput,
  type GitAuthorActivity,
  type GitBranchSummary,
  type GitCommitCompare,
  type GitCommitDetail,
  type GitCommitPage,
  type GitFilePair,
  type ListGitAuthorActivityInput,
  type ListGitCommitsInput,
  type ReadGitFilePairInput,
  type TeamMember,
} from "@hrms/azure-devops";
import { findScriptObject, getModuleDefinition } from "@hrms/db";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import type { GitTraceCatalog } from "@/features/azure/git/catalog";
import type { DatabaseModuleScript } from "@/features/azure/git/script-object";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";
import { getHrmsDb } from "@/shared/db";
import { parseEnvironmentName } from "@/shared/db/environments";

async function azureClient(): Promise<AzureDevOpsClient> {
  await requireFeature("azure");
  return getAzureDevOpsClient();
}

export async function loadGitCatalog(): Promise<GitTraceCatalog> {
  const client = await azureClient();
  const [repositories, authors] = await Promise.all([
    listGitRepositories(client),
    listTeamMembers(client, client.config.team?.trim() || DEFAULT_BOARD_TEAM).catch((): TeamMember[] => []),
  ]);
  return {
    organizationUrl: client.config.orgUrl,
    project: client.config.project,
    repositories,
    authors,
  };
}

export async function loadGitAuthorActivity(input: ListGitAuthorActivityInput): Promise<GitAuthorActivity> {
  const client = await azureClient();
  return listGitAuthorActivity(client, input);
}

export async function loadGitBranches(repositoryId: string): Promise<GitBranchSummary[]> {
  const client = await azureClient();
  return listGitBranches(client, repositoryId);
}

const gitFileIndexCache = new Map<string, readonly string[]>();

export async function searchGitFilePaths(input: {
  repositoryId: string;
  branch: string;
  commitId: string;
  query: string;
}): Promise<readonly string[]> {
  const query = input.query.trim();
  if (query.length === 0) {
    return [];
  }
  const commitId = input.commitId.trim();
  const cacheKey = commitId.length > 0 ? `${input.repositoryId}\n${commitId}` : "";
  const client = await azureClient();
  const found = await searchGitPaths(client, input.repositoryId, input.branch, query);
  const paths = [...new Set([...(gitFileIndexCache.get(cacheKey) ?? []), ...found])];
  if (cacheKey.length > 0) {
    gitFileIndexCache.set(cacheKey, paths);
  }
  return paths;
}

export async function loadGitCommits(input: ListGitCommitsInput): Promise<GitCommitPage> {
  const client = await azureClient();
  return listGitCommits(client, input);
}

export async function loadGitCommitDetail(
  repositoryId: string,
  commitId: string,
): Promise<GitCommitDetail> {
  const client = await azureClient();
  return getGitCommitDetail(client, repositoryId, commitId);
}

export async function loadGitCommitCompare(input: CompareGitCommitsInput): Promise<GitCommitCompare> {
  const client = await azureClient();
  return compareGitCommits(client, input);
}

export async function loadGitFilePair(input: ReadGitFilePairInput): Promise<GitFilePair> {
  const client = await azureClient();
  return readGitFilePair(client, input);
}

export async function loadDatabaseModuleScript(input: {
  environment: string;
  schema: string;
  name: string;
}): Promise<DatabaseModuleScript> {
  await requireFeature("azure");
  const environment = parseEnvironmentName(input.environment);
  if (!environment) {
    throw new Error("Unknown environment.");
  }
  const schema = input.schema.trim() || "dbo";
  const name = input.name.trim();
  const db = await getHrmsDb(environment);
  const found = await findScriptObject(db, { schema, name });
  if (!found) {
    return {
      schema,
      name,
      kind: null,
      definition: null,
      unavailableReason: `Unable to find ${schema}.${name} in the ${environment} database.`,
    };
  }
  if (found.kind === "table") {
    return {
      schema: found.schema,
      name: found.name,
      kind: "table",
      definition: null,
      unavailableReason: `${found.schema}.${found.name} is a table, so there is no module script to compare.`,
    };
  }
  const definition = await getModuleDefinition(db, {
    schema: found.schema,
    name: found.name,
    kind: found.kind,
  });
  return {
    schema: definition.schema,
    name: definition.name,
    kind: definition.kind,
    definition: definition.definition,
    unavailableReason: definition.unavailableReason,
  };
}
