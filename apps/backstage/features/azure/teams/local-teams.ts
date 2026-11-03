import { z } from "zod";

export const LocalTeamEntrySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a team name"),
  azureTeam: z.string().trim().min(1, "Enter an Azure DevOps team"),
  members: z.array(z.string().trim().min(1)),
  updatedAt: z.string().min(1),
  updatedBy: z.string().nullable(),
});

export type LocalTeamEntry = z.infer<typeof LocalTeamEntrySchema>;

export const LocalTeamsFileSchema = z.object({
  version: z.literal(1),
  teams: z.array(LocalTeamEntrySchema),
});

export type LocalTeamsFile = z.infer<typeof LocalTeamsFileSchema>;

/** Legacy tracking-list shape used only for one-time migration. */
const LegacyTrackingListSchema = z.object({
  version: z.literal(1),
  lists: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      team: z.string(),
      members: z.array(z.string()),
      updatedAt: z.string(),
      updatedBy: z.string().nullable(),
    }),
  ),
});

export function emptyLocalTeams(): LocalTeamsFile {
  return { version: 1, teams: [] };
}

export function dedupeMembers(members: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const member of members) {
    const trimmed = member.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export type LocalTeamInput = {
  name: string;
  azureTeam: string;
  members: readonly string[];
  updatedBy?: string | null;
};

function assertUniqueName(
  teams: readonly LocalTeamEntry[],
  name: string,
  exceptId?: string,
): void {
  const conflict = teams.find(
    (entry) =>
      entry.id !== exceptId && entry.name.toLowerCase() === name.toLowerCase(),
  );
  if (conflict != null) {
    throw new Error(`A team named "${name}" already exists`);
  }
}

export function createLocalTeam(
  file: LocalTeamsFile,
  input: LocalTeamInput,
  id: string,
  updatedAt: string = new Date().toISOString(),
): LocalTeamsFile {
  const name = input.name.trim();
  const azureTeam = input.azureTeam.trim();
  if (name.length === 0) {
    throw new Error("Enter a team name");
  }
  if (azureTeam.length === 0) {
    throw new Error("Enter an Azure DevOps team");
  }
  assertUniqueName(file.teams, name);
  const entry: LocalTeamEntry = {
    id,
    name,
    azureTeam,
    members: dedupeMembers(input.members),
    updatedAt,
    updatedBy: input.updatedBy ?? null,
  };
  return { version: 1, teams: [...file.teams, LocalTeamEntrySchema.parse(entry)] };
}

export function updateLocalTeam(
  file: LocalTeamsFile,
  id: string,
  input: LocalTeamInput,
  updatedAt: string = new Date().toISOString(),
): LocalTeamsFile {
  const index = file.teams.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new Error("Team not found");
  }
  const name = input.name.trim();
  const azureTeam = input.azureTeam.trim();
  if (name.length === 0) {
    throw new Error("Enter a team name");
  }
  if (azureTeam.length === 0) {
    throw new Error("Enter an Azure DevOps team");
  }
  assertUniqueName(file.teams, name, id);
  const entry: LocalTeamEntry = {
    id,
    name,
    azureTeam,
    members: dedupeMembers(input.members),
    updatedAt,
    updatedBy: input.updatedBy ?? null,
  };
  const teams = [...file.teams];
  teams[index] = LocalTeamEntrySchema.parse(entry);
  return { version: 1, teams };
}

export function deleteLocalTeam(file: LocalTeamsFile, id: string): LocalTeamsFile {
  const teams = file.teams.filter((entry) => entry.id !== id);
  if (teams.length === file.teams.length) {
    throw new Error("Team not found");
  }
  return { version: 1, teams };
}

export function findLocalTeam(
  file: LocalTeamsFile,
  id: string,
): LocalTeamEntry | null {
  return file.teams.find((entry) => entry.id === id) ?? null;
}

/** Map legacy `_progress-lists/lists.json` JSON into the local-teams file shape. */
export function migrateFromTrackingLists(raw: unknown): LocalTeamsFile {
  const parsed = LegacyTrackingListSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Legacy tracking lists are invalid");
  }
  const teams = parsed.data.lists.map((list) =>
    LocalTeamEntrySchema.parse({
      id: list.id,
      name: list.name.trim(),
      azureTeam: list.team.trim(),
      members: dedupeMembers(list.members),
      updatedAt: list.updatedAt,
      updatedBy: list.updatedBy,
    }),
  );
  return { version: 1, teams };
}
