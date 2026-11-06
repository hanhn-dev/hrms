import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  BranchDefaultsFileSchema,
  emptyBranchDefaults,
  type BranchDefaultsFile,
} from "@/features/azure/git/branch-defaults";

export const GIT_BRANCH_DEFAULTS_DIR_NAME = "_git-branch-defaults";
export const GIT_BRANCH_DEFAULTS_FILE_NAME = "defaults.json";

export const DEFAULT_GIT_BRANCH_DEFAULTS_DIR = path.join(
  process.cwd(),
  "content",
  "azure",
  GIT_BRANCH_DEFAULTS_DIR_NAME,
);

export const DEFAULT_GIT_BRANCH_DEFAULTS_PATH = path.join(
  DEFAULT_GIT_BRANCH_DEFAULTS_DIR,
  GIT_BRANCH_DEFAULTS_FILE_NAME,
);

export function writeBranchDefaults(
  file: BranchDefaultsFile,
  filePath: string = DEFAULT_GIT_BRANCH_DEFAULTS_PATH,
): void {
  const result = BranchDefaultsFileSchema.safeParse(file);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Branch defaults file is invalid");
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(result.data, null, 2)}\n`, "utf8");
}

export function readBranchDefaults(filePath: string = DEFAULT_GIT_BRANCH_DEFAULTS_PATH): BranchDefaultsFile {
  if (!existsSync(filePath)) {
    return emptyBranchDefaults();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("Branch defaults file is not valid JSON");
  }
  const result = BranchDefaultsFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Branch defaults file is invalid");
  }
  return result.data;
}
