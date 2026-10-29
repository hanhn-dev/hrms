import type { GitRepositorySummary, TeamMember } from "@hrms/azure-devops";

export type GitTraceCatalog = {
  readonly organizationUrl: string;
  readonly project: string;
  readonly repositories: readonly GitRepositorySummary[];
  readonly authors: readonly TeamMember[];
};
