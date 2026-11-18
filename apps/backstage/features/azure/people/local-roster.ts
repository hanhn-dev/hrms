import type { TeamMember } from "@hrms/azure-devops";
import { teamMembersFromNames } from "@/features/azure/people/team-member-options";
import { readLocalTeams } from "@/features/azure/teams/local-teams-store";

/** Local progress-team members as TeamMember stubs (display name used as id). */
export function localProgressTeamMembers(): TeamMember[] {
  return teamMembersFromNames(readLocalTeams().teams.flatMap((team) => team.members));
}
