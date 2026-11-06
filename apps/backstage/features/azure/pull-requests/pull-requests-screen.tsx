import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import { PullRequestsSearchSlot } from "@/features/azure/pull-requests/pull-requests-search-slot";
import { PullRequestsTabBar } from "@/features/azure/pull-requests/pull-requests-tab-bar";
import type { PullRequestsTab } from "@/features/azure/pull-requests/pull-requests-tab";
import { PullRequestsTrackingSlot } from "@/features/azure/pull-requests/pull-requests-tracking-slot";
import type {
  TrackingPrMode,
  TrackingPrPreset,
} from "@/features/azure/pull-requests/tracking-range";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

const HELP = [
  {
    id: "lookup",
    type: "info" as const,
    title: "Combine work items and pull requests",
    description:
      "Paste work item IDs, or filter by module (area path), type, state, iteration, assignee, tags, and title. Add a date range and authors to narrow the pull requests. Filled filters are combined. Values inside one list match any of those values. Blank filters are ignored.",
  },
  {
    id: "cherry-pick",
    type: "info" as const,
    title: "Command only — nothing runs here",
    description:
      "Selecting rows builds a single `git cherry-pick -m 1 --allow-empty --keep-redundant-commits <hashes>` command from each PR's merge commit, in the table's current row order (default: Merged oldest → newest). Already-on-branch patches stay in the sequence instead of aborting. Copy it and run it in your own local git checkout.",
  },
  {
    id: "merge-commit",
    type: "warning" as const,
    title: "Active pull requests have no merge commit yet",
    description:
      "Only completed pull requests have a merge commit to cherry-pick, so those rows are not selectable.",
  },
  {
    id: "tracking",
    type: "info" as const,
    title: "Tracking — pull requests by team member",
    description:
      "On the Tracking tab, pick a local team to count PRs each member opened in the period (by author). Quick mode defaults to Last week and also offers Last 2 weeks, Last 3 weeks, Last month, and Last 3 months. Sprint mode uses the selected iteration’s dates; Custom mode uses ?prFrom=&prTo=. Members are matched to Azure DevOps identities by display name. Click a row or Opened count to list that person’s PRs.",
  },
];

export async function PullRequestsScreen({
  tab,
  teamId,
  sprint,
  prMode,
  prPreset,
  prFrom,
  prTo,
}: {
  tab: PullRequestsTab;
  teamId: string | null;
  sprint?: string;
  prMode: TrackingPrMode;
  prPreset: TrackingPrPreset;
  prFrom: string | null;
  prTo: string | null;
}): Promise<React.JSX.Element> {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col p-3 md:p-4">
        <div className="shrink-0">
          <PageHeader
            compact
            extra={<AzureNav active="pull-requests" />}
            notes={HELP}
            title="Pull requests"
          />
          <PullRequestsTabBar active={tab} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2">
          {tab === "tracking" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Suspense fallback={<SectionFallback title="Pull request tracking" />}>
                <PullRequestsTrackingSlot
                  prFrom={prFrom}
                  prMode={prMode}
                  prPreset={prPreset}
                  prTo={prTo}
                  sprint={sprint}
                  teamId={teamId}
                />
              </Suspense>
            </div>
          ) : (
            <Suspense fallback={<SectionFallback title="Pull request search" />}>
              <PullRequestsSearchSlot />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
