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
      "Selecting rows builds a single `git cherry-pick -m 1 <hashes>` command from each PR's merge commit. Copy it and run it in your own local git checkout.",
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
    <div className="h-screen overflow-y-auto">
      <div className="mx-auto max-w-6xl p-6">
        <PageHeader extra={<AzureNav active="pull-requests" />} notes={HELP} title="Pull requests" />
        <Suspense fallback={<SectionFallback title="Pull request search" />}>
          <PullRequestsSearchSlot />
        </Suspense>
      </div>
    </div>
  );
}
