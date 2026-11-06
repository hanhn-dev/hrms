import type { TeamIteration } from "@hrms/azure-devops";
import { ProgressPanel } from "@/features/azure/progress/progress-panel";
import {
  listIterations,
  loadSprintProgress,
  loadVelocityProgress,
} from "@/features/azure/progress/queries";
import { listLocalTeams } from "@/features/azure/teams/queries";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";

function resolveSelectedTeam(
  localTeams: readonly LocalTeamEntry[],
  teamId: string | null,
): { selected: LocalTeamEntry | null; missingTeam: boolean } {
  if (teamId == null) {
    return { selected: null, missingTeam: false };
  }
  const selected = localTeams.find((team) => team.id === teamId) ?? null;
  return { selected, missingTeam: selected == null };
}

export async function ProgressSlot({
  teamId,
  sprint,
}: {
  teamId: string | null;
  sprint?: string;
}): Promise<React.JSX.Element> {
  const localTeams = await listLocalTeams();
  const { selected: selectedTeam, missingTeam } = resolveSelectedTeam(localTeams, teamId);

  const iterations =
    selectedTeam != null ? await listIterations(selectedTeam.azureTeam) : [];
  const current = iterations.find((item) => item.timeFrame === "current") ?? null;
  const requested = sprint?.trim() ?? "";
  const selected: TeamIteration | null =
    requested.length > 0
      ? (iterations.find((item) => item.path === requested) ?? null)
      : current;

  const members = selectedTeam?.members ?? [];
  const [sprintProgress, velocity] =
    selectedTeam != null
      ? await Promise.all([
          selected
            ? loadSprintProgress(selectedTeam.azureTeam, selected.path, members)
            : Promise.resolve({
                rows: [],
                allWorkItems: [],
                truncated: false,
                workItemCount: 0,
              }),
          loadVelocityProgress(selectedTeam.azureTeam, members),
        ])
      : [
          { rows: [], allWorkItems: [], truncated: false, workItemCount: 0 },
          {
            series: { iterations: [], members: [], counts: new Map(), cells: [] },
            truncatedPaths: [],
          },
        ];

  return (
    <ProgressPanel
      allWorkItems={sprintProgress.allWorkItems}
      currentIterationPath={current?.path}
      iterations={iterations}
      localTeams={localTeams}
      missingIteration={requested.length > 0 && selected == null}
      missingTeam={missingTeam}
      rows={sprintProgress.rows}
      selected={selected}
      selectedTeam={selectedTeam}
      truncated={sprintProgress.truncated}
      velocity={velocity.series}
      velocityTruncatedPaths={velocity.truncatedPaths}
    />
  );
}
