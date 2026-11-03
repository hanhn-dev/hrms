"use server";

import { randomUUID } from "node:crypto";
import {
  listProjectMembers,
  listProjectTeams,
  searchIdentities,
  type ProjectTeam,
  type TeamMember,
} from "@hrms/azure-devops";
import {
  createLocalTeam,
  deleteLocalTeam,
  findLocalTeam,
  updateLocalTeam,
  type LocalTeamEntry,
} from "@/features/azure/teams/local-teams";
import {
  readLocalTeams,
  writeLocalTeams,
} from "@/features/azure/teams/local-teams-store";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

export async function listAzureProjectTeams(): Promise<ProjectTeam[]> {
  await requireFeature("azure");
  return listProjectTeams(getAzureDevOpsClient());
}

/** Users with access to the Azure DevOps project (Graph project scope). */
export async function listAzureProjectMembers(): Promise<TeamMember[]> {
  await requireFeature("azure");
  return listProjectMembers(getAzureDevOpsClient());
}

/** Directory search for people who may not appear in the project Graph roster yet. */
export async function searchAzureIdentities(query: string): Promise<TeamMember[]> {
  await requireFeature("azure");
  return searchIdentities(getAzureDevOpsClient(), query);
}

export async function listLocalTeams(): Promise<LocalTeamEntry[]> {
  await requireFeature("azure");
  return readLocalTeams().teams;
}

export async function saveLocalTeam(input: {
  id?: string | null;
  name: string;
  azureTeam: string;
  members: readonly string[];
}): Promise<LocalTeamEntry> {
  const session = await requireFeature("azure");
  const updatedBy = session.name ?? session.email ?? null;
  const current = readLocalTeams();
  const id = input.id?.trim() ?? "";
  const next =
    id.length > 0
      ? updateLocalTeam(current, id, {
          name: input.name,
          azureTeam: input.azureTeam,
          members: input.members,
          updatedBy,
        })
      : createLocalTeam(
          current,
          {
            name: input.name,
            azureTeam: input.azureTeam,
            members: input.members,
            updatedBy,
          },
          randomUUID(),
        );
  writeLocalTeams(next);
  const saved =
    id.length > 0
      ? findLocalTeam(next, id)
      : (next.teams[next.teams.length - 1] ?? null);
  if (saved == null) {
    throw new Error("Could not save team");
  }
  return saved;
}

export async function removeLocalTeam(id: string): Promise<void> {
  await requireFeature("azure");
  writeLocalTeams(deleteLocalTeam(readLocalTeams(), id));
}
