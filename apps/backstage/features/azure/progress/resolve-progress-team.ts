import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";

/** Local team name / Azure team Team progress opens on when the URL has no teamId. */
export const DEFAULT_PROGRESS_TEAM_NAME = DEFAULT_BOARD_TEAM;

export function findDefaultProgressTeam(
  localTeams: readonly LocalTeamEntry[],
): LocalTeamEntry | null {
  return (
    localTeams.find((team) => team.name === DEFAULT_PROGRESS_TEAM_NAME) ??
    localTeams.find((team) => team.azureTeam === DEFAULT_PROGRESS_TEAM_NAME) ??
    null
  );
}

export function resolveSelectedProgressTeam(
  localTeams: readonly LocalTeamEntry[],
  teamId: string | null,
): { selected: LocalTeamEntry | null; missingTeam: boolean } {
  if (teamId == null) {
    return { selected: findDefaultProgressTeam(localTeams), missingTeam: false };
  }
  const selected = localTeams.find((team) => team.id === teamId) ?? null;
  return { selected, missingTeam: selected == null };
}
