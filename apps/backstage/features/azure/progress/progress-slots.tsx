import { Suspense } from "react";
import type { TeamIteration } from "@hrms/azure-devops";
import { toDateOnly } from "@/features/azure/progress/aggregate-pull-requests";
import { ProgressPanel } from "@/features/azure/progress/progress-panel";
import {
  DEFAULT_PROGRESS_PR_MODE,
  DEFAULT_PROGRESS_PR_PRESET,
  resolvePresetRange,
  type ProgressPrMode,
  type ProgressPrPreset,
} from "@/features/azure/progress/progress-pr-range";
import { ProgressPullRequestsPanel } from "@/features/azure/progress/progress-pull-requests-panel";
import {
  listIterations,
  loadSprintProgress,
  loadTeamMemberPullRequests,
  loadVelocityProgress,
} from "@/features/azure/progress/queries";
import { listLocalTeams } from "@/features/azure/teams/queries";
import type { LocalTeamEntry } from "@/features/azure/teams/local-teams";
import { SectionFallback } from "@/shared/ui/section-fallback";

export {
  parseProgressPrMode,
  parseProgressPrPreset,
} from "@/features/azure/progress/progress-pr-range";
export { toDateOnly as parseProgressPrDate } from "@/features/azure/progress/aggregate-pull-requests";

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

function resolvePrDates(
  mode: ProgressPrMode,
  preset: ProgressPrPreset,
  sprint: TeamIteration | null,
  prFrom: string | null,
  prTo: string | null,
): { dateFrom: string | null; dateTo: string | null } {
  if (mode === "custom") {
    return { dateFrom: prFrom, dateTo: prTo };
  }
  if (mode === "sprint") {
    return {
      dateFrom: toDateOnly(sprint?.startDate ?? null),
      dateTo: toDateOnly(sprint?.finishDate ?? null),
    };
  }
  const range = resolvePresetRange(preset);
  return { dateFrom: range.from, dateTo: range.to };
}

async function ProgressPullRequestsSlot({
  members,
  azureTeam,
  dateFrom,
  dateTo,
}: {
  members: readonly string[];
  azureTeam: string;
  dateFrom: string | null;
  dateTo: string | null;
}): Promise<React.JSX.Element> {
  const data = await loadTeamMemberPullRequests(members, dateFrom, dateTo, azureTeam);
  return <ProgressPullRequestsPanel data={data} />;
}

export async function ProgressSlot({
  teamId,
  sprint,
  prMode = DEFAULT_PROGRESS_PR_MODE,
  prPreset = DEFAULT_PROGRESS_PR_PRESET,
  prFrom = null,
  prTo = null,
}: {
  teamId: string | null;
  sprint?: string;
  prMode?: ProgressPrMode;
  prPreset?: ProgressPrPreset;
  prFrom?: string | null;
  prTo?: string | null;
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

  const { dateFrom: prDateFrom, dateTo: prDateTo } = resolvePrDates(
    prMode,
    prPreset,
    selected,
    prFrom,
    prTo,
  );

  const pullRequests =
    selectedTeam != null && selected != null ? (
      <Suspense fallback={<SectionFallback title="Pull requests" />}>
        <ProgressPullRequestsSlot
          azureTeam={selectedTeam.azureTeam}
          dateFrom={prDateFrom}
          dateTo={prDateTo}
          members={members}
        />
      </Suspense>
    ) : null;

  return (
    <ProgressPanel
      allWorkItems={sprintProgress.allWorkItems}
      currentIterationPath={current?.path}
      iterations={iterations}
      localTeams={localTeams}
      missingIteration={requested.length > 0 && selected == null}
      missingTeam={missingTeam}
      prFrom={prFrom}
      prMode={prMode}
      prPreset={prPreset}
      prTo={prTo}
      pullRequests={pullRequests}
      rows={sprintProgress.rows}
      selected={selected}
      selectedTeam={selectedTeam}
      truncated={sprintProgress.truncated}
      velocity={velocity.series}
      velocityTruncatedPaths={velocity.truncatedPaths}
    />
  );
}
