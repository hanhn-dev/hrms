"use server";

import {
  listTeamMembers,
  searchIdentities,
  type TeamMember,
} from "@hrms/azure-devops";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import { localProgressTeamMembers } from "@/features/azure/people/local-roster";
import {
  filterTeamMembersByQuery,
  mergeTeamMembers,
} from "@/features/azure/people/team-member-options";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure";

/**
 * Board-team roster merged with local progress-team members. Local stubs fill
 * gaps; Azure ids win when the same person appears on both.
 */
export async function loadAzurePeopleRoster(team?: string): Promise<TeamMember[]> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const azureTeam = team?.trim() || client.config.team?.trim() || DEFAULT_BOARD_TEAM;
  const boardMembers = await listTeamMembers(client, azureTeam).catch((): TeamMember[] => []);
  return mergeTeamMembers(boardMembers, localProgressTeamMembers());
}

/**
 * Directory search for people who may not be on the board-team roster.
 * Always includes matching local progress-team members; identity search is a
 * supplement when the Azure Identity API returns hits. Real Azure ids upgrade
 * local stubs when both match the same display name.
 */
export async function searchAzurePeople(query: string): Promise<TeamMember[]> {
  await requireFeature("azure");
  const client = getAzureDevOpsClient();
  const localHits = filterTeamMembersByQuery(localProgressTeamMembers(), query);
  const identityHits = await searchIdentities(client, query).catch((): TeamMember[] => []);
  return mergeTeamMembers(localHits, identityHits);
}
