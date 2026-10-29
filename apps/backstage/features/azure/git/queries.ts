"use server";

import {
  compareGitCommits,
  getGitCommitDetail,
  listGitAuthorActivity,
  listGitBranches,
  listGitCommits,
  listGitRepositories,
  listProjectMembers,
  readGitFilePair,
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
import type { GitTraceCatalog } from "@/features/azure/git/catalog";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

async function azureClient(): Promise<AzureDevOpsClient> {
  await requireFeature("azure");
  return getAzureDevOpsClient();
}

export async function loadGitCatalog(): Promise<GitTraceCatalog> {
  const client = await azureClient();
  const [repositories, authors] = await Promise.all([
    listGitRepositories(client),
    listProjectMembers(client).catch((): TeamMember[] => []),
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
