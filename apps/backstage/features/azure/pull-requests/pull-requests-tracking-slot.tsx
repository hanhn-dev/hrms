import { Suspense } from "react";
import type { TeamIteration } from "@hrms/azure-devops";
import { toDateOnly } from "@/features/azure/pull-requests/aggregate-pull-requests";
import { PullRequestsTrackingPanel } from "@/features/azure/pull-requests/pull-requests-tracking-panel";
import {
  listTrackingIterations,
  loadTeamMemberPullRequests,
} from "@/features/azure/pull-requests/queries";
import { PullRequestsTrackingResults } from "@/features/azure/pull-requests/tracking-results";
import {
  DEFAULT_TRACKING_PR_MODE,
  DEFAULT_TRACKING_PR_PRESET,
  resolvePresetRange,
  type TrackingPrMode,
  type TrackingPrPreset,
} from "@/features/azure/pull-requests/tracking-range";
import { resolveSelectedTrackingTeam } from "@/features/azure/pull-requests/resolve-tracking-team";
import { listLocalTeams } from "@/features/azure/teams/queries";
import { SectionFallback } from "@/shared/ui/section-fallback";

function resolvePrDates(
  mode: TrackingPrMode,
  preset: TrackingPrPreset,
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

async function TrackingResultsSlot({
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
  return <PullRequestsTrackingResults data={data} />;
}

export async function PullRequestsTrackingSlot({
  teamId,
  sprint,
  prMode = DEFAULT_TRACKING_PR_MODE,
  prPreset = DEFAULT_TRACKING_PR_PRESET,
  prFrom = null,
  prTo = null,
}: {
  teamId: string | null;
  sprint?: string;
  prMode?: TrackingPrMode;
  prPreset?: TrackingPrPreset;
  prFrom?: string | null;
  prTo?: string | null;
}): Promise<React.JSX.Element> {
  const localTeams = await listLocalTeams();
  const { selected: selectedTeam, missingTeam } = resolveSelectedTrackingTeam(
    localTeams,
    teamId,
  );

  const iterations =
    selectedTeam != null ? await listTrackingIterations(selectedTeam.azureTeam) : [];
  const current = iterations.find((item) => item.timeFrame === "current") ?? null;
  const requested = sprint?.trim() ?? "";
  const selected: TeamIteration | null =
    requested.length > 0
      ? (iterations.find((item) => item.path === requested) ?? null)
      : current;

  const members = selectedTeam?.members ?? [];
  const { dateFrom, dateTo } = resolvePrDates(prMode, prPreset, selected, prFrom, prTo);

  const results =
    selectedTeam != null ? (
      <Suspense fallback={<SectionFallback title="Pull request tracking" />}>
        <TrackingResultsSlot
          azureTeam={selectedTeam.azureTeam}
          dateFrom={dateFrom}
          dateTo={dateTo}
          members={members}
        />
      </Suspense>
    ) : null;

  return (
    <PullRequestsTrackingPanel
      currentIterationPath={current?.path}
      iterations={iterations}
      localTeams={localTeams}
      missingIteration={requested.length > 0 && selected == null}
      missingTeam={missingTeam}
      prFrom={prFrom}
      prMode={prMode}
      prPreset={prPreset}
      prTo={prTo}
      results={results}
      selected={selected}
      selectedTeam={selectedTeam}
    />
  );
}
