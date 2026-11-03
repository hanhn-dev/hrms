import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  emptyLocalTeams,
  LocalTeamsFileSchema,
  migrateFromTrackingLists,
  type LocalTeamsFile,
} from "@/features/azure/teams/local-teams";

export const PROGRESS_TEAMS_DIR_NAME = "_progress-teams";
export const PROGRESS_TEAMS_FILE_NAME = "teams.json";

export const DEFAULT_PROGRESS_TEAMS_DIR = path.join(
  process.cwd(),
  "content",
  "azure",
  PROGRESS_TEAMS_DIR_NAME,
);

export const DEFAULT_PROGRESS_TEAMS_PATH = path.join(
  DEFAULT_PROGRESS_TEAMS_DIR,
  PROGRESS_TEAMS_FILE_NAME,
);

/** Legacy tracking-list path used only when migrating. */
export const DEFAULT_LEGACY_PROGRESS_LISTS_PATH = path.join(
  process.cwd(),
  "content",
  "azure",
  "_progress-lists",
  "lists.json",
);

export function writeLocalTeams(
  file: LocalTeamsFile,
  filePath: string = DEFAULT_PROGRESS_TEAMS_PATH,
): void {
  const result = LocalTeamsFileSchema.safeParse(file);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Teams file is invalid");
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(result.data, null, 2)}\n`, "utf8");
}

export function readLocalTeams(
  filePath: string = DEFAULT_PROGRESS_TEAMS_PATH,
  legacyPath: string = DEFAULT_LEGACY_PROGRESS_LISTS_PATH,
): LocalTeamsFile {
  if (existsSync(filePath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      throw new Error("Teams file is not valid JSON");
    }
    const result = LocalTeamsFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Teams file is invalid");
    }
    return result.data;
  }

  if (existsSync(legacyPath)) {
    let legacyRaw: unknown;
    try {
      legacyRaw = JSON.parse(readFileSync(legacyPath, "utf8"));
    } catch {
      throw new Error("Legacy tracking lists file is not valid JSON");
    }
    const migrated = migrateFromTrackingLists(legacyRaw);
    writeLocalTeams(migrated, filePath);
    return migrated;
  }

  return emptyLocalTeams();
}
