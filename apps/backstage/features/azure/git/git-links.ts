export function buildGitBlameUrl(input: {
  organizationUrl: string;
  project: string;
  repositoryName: string;
  path: string;
  branch: string;
}): string {
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const hash = [
    `path=${encodeURIComponent(path)}`,
    `version=${encodeURIComponent(`GB${input.branch}`)}`,
    "annotate=true",
  ].join("&");
  return `${repositoryWebRoot(input)}#${hash}`;
}

export function buildGitCommitUrl(input: {
  organizationUrl: string;
  project: string;
  repositoryName: string;
  commitId: string;
}): string {
  return `${repositoryWebRoot(input)}/commit/${encodeURIComponent(input.commitId)}`;
}

export function buildGitPullRequestUrl(input: {
  organizationUrl: string;
  project: string;
  repositoryName: string;
  pullRequestId: number;
}): string {
  return `${repositoryWebRoot(input)}/pullrequest/${input.pullRequestId}`;
}

export function buildGitWorkItemUrl(
  organizationUrl: string,
  project: string,
  workItemId: number,
): string {
  return `${organizationRoot(organizationUrl)}/${encodeURIComponent(project)}/_workitems/edit/${workItemId}`;
}

function repositoryWebRoot(input: {
  organizationUrl: string;
  project: string;
  repositoryName: string;
}): string {
  return `${organizationRoot(input.organizationUrl)}/${encodeURIComponent(input.project)}/_git/${encodeURIComponent(input.repositoryName)}`;
}

function organizationRoot(organizationUrl: string): string {
  return organizationUrl.trim().replace(/\/+$/, "");
}
