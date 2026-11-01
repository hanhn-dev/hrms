const DATABASE_REPOSITORY_NAME = "TDG HRMS DB";
const SOURCE_REPOSITORY_NAME = "TDG HRMS";
const QA_BRANCH_NAME = "QA";
const STAGING_BRANCH_NAME = "Staging";
const QA_ENVIRONMENT_NAME = "QA";

function sameName(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
}

export function isDatabaseRepository(name: string): boolean {
  return sameName(name, DATABASE_REPOSITORY_NAME);
}

function isSourceRepository(name: string): boolean {
  return sameName(name, SOURCE_REPOSITORY_NAME);
}

function branchName(branches: readonly { name: string }[], wanted: string): string | null {
  return branches.find((item) => sameName(item.name, wanted))?.name ?? null;
}

function firstOther(branches: readonly { name: string }[], name: string): string {
  return branches.find((item) => item.name !== name)?.name ?? name;
}

function standardPair(
  branches: readonly { name: string }[],
  defaultBranch: string | null,
): { left: string; right: string } {
  const preferred =
    defaultBranch && branches.some((item) => item.name === defaultBranch)
      ? defaultBranch
      : (branches[0]?.name ?? "");
  return { left: preferred, right: firstOther(branches, preferred) };
}

function withStagingOnRight(
  standard: { left: string; right: string },
  branches: readonly { name: string }[],
  staging: string,
): { left: string; right: string } {
  const left = standard.left === staging ? firstOther(branches, staging) : standard.left;
  return { left, right: staging };
}

export function preferredFileBranches(
  repositoryName: string,
  branches: readonly { name: string }[],
  defaultBranch: string | null,
): { left: string; right: string } {
  const standard = standardPair(branches, defaultBranch);
  const staging = branchName(branches, STAGING_BRANCH_NAME);
  if (isDatabaseRepository(repositoryName)) {
    const qa = branchName(branches, QA_BRANCH_NAME);
    if (qa && staging) {
      return { left: qa, right: staging };
    }
    if (qa) {
      return { left: qa, right: firstOther(branches, qa) };
    }
    if (staging) {
      return withStagingOnRight(standard, branches, staging);
    }
    return standard;
  }
  if (isSourceRepository(repositoryName) && staging) {
    return withStagingOnRight(standard, branches, staging);
  }
  return standard;
}

export function preferredDatabaseEnvironment(environments: readonly string[]): string {
  return environments.find((name) => sameName(name, QA_ENVIRONMENT_NAME)) ?? environments[0] ?? "";
}
