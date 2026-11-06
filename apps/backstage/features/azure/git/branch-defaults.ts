import { z } from "zod";
import { isDatabaseRepository, preferredFileBranches } from "@/features/azure/git/file-branch-defaults";

const branchNameSchema = z.string().trim().min(1);

export const BranchDefaultEntrySchema = z.object({
  repositoryName: branchNameSchema,
  defaultBranch: branchNameSchema,
  leftBranch: branchNameSchema,
  rightBranch: branchNameSchema,
});

export type BranchDefaultEntry = z.infer<typeof BranchDefaultEntrySchema>;

export const BranchDefaultsFileSchema = z.object({
  version: z.literal(1),
  repositories: z.array(BranchDefaultEntrySchema),
});

export type BranchDefaultsFile = z.infer<typeof BranchDefaultsFileSchema>;

export type ResolvedBranchDefaults = {
  readonly history: string;
  readonly left: string;
  readonly right: string;
};

function sameName(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
}

export function emptyBranchDefaults(): BranchDefaultsFile {
  return { version: 1, repositories: [] };
}

export function findRepositoryBranchDefaults(
  file: BranchDefaultsFile,
  repositoryName: string,
): BranchDefaultEntry | null {
  return file.repositories.find((item) => sameName(item.repositoryName, repositoryName)) ?? null;
}

export function saveRepositoryBranchDefaults(
  file: BranchDefaultsFile,
  entry: BranchDefaultEntry,
): BranchDefaultsFile {
  const parsed = BranchDefaultEntrySchema.parse(entry);
  return {
    version: 1,
    repositories: [
      ...file.repositories.filter((item) => !sameName(item.repositoryName, parsed.repositoryName)),
      parsed,
    ],
  };
}

export function removeRepositoryBranchDefaults(
  file: BranchDefaultsFile,
  repositoryName: string,
): BranchDefaultsFile {
  return {
    version: 1,
    repositories: file.repositories.filter((item) => !sameName(item.repositoryName, repositoryName)),
  };
}

function namedBranch(branches: readonly { name: string }[], wanted: string | null | undefined): string | null {
  const name = wanted?.trim() ?? "";
  if (name.length === 0) {
    return null;
  }
  return branches.find((item) => sameName(item.name, name))?.name ?? null;
}

function pick(wanted: string | null | undefined, branches: readonly { name: string }[], fallback: string): string {
  return namedBranch(branches, wanted) ?? fallback;
}

function builtinHistory(
  repositoryName: string,
  branches: readonly { name: string }[],
  azureDefaultBranch: string | null,
  pair: { left: string },
): string {
  if (isDatabaseRepository(repositoryName)) {
    return pair.left;
  }
  if (azureDefaultBranch && branches.some((item) => item.name === azureDefaultBranch)) {
    return azureDefaultBranch;
  }
  return pair.left;
}

export function resolveRepositoryBranches(input: {
  repositoryName: string;
  branches: readonly { name: string }[];
  azureDefaultBranch: string | null;
  configured: BranchDefaultEntry | null;
}): ResolvedBranchDefaults {
  const pair = preferredFileBranches(input.repositoryName, input.branches, input.azureDefaultBranch);
  const history = builtinHistory(input.repositoryName, input.branches, input.azureDefaultBranch, pair);
  return {
    history: pick(input.configured?.defaultBranch, input.branches, history),
    left: pick(input.configured?.leftBranch, input.branches, pair.left),
    right: pick(input.configured?.rightBranch, input.branches, pair.right),
  };
}
