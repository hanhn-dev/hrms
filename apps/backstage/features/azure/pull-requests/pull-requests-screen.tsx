import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import { PullRequestsSearchSlot } from "@/features/azure/pull-requests/pull-requests-search-slot";
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
];

export async function PullRequestsScreen(): Promise<React.JSX.Element> {
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
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<SectionFallback title="Pull request search" />}>
            <PullRequestsSearchSlot />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
