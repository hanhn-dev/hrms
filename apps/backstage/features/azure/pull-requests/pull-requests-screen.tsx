import { AzureNav } from "@/features/azure/azure-nav";
import { PullRequestsPanel } from "@/features/azure/pull-requests/pull-requests-panel";
import { PageHeader } from "@/shared/ui/page-header";

const HELP = [
  {
    id: "lookup",
    type: "info" as const,
    title: "Work items and bugs, not just stories",
    description:
      "Enter any comma-separated Azure DevOps work item IDs — User Stories, Bugs, Tasks. Every pull request linked to those items or their child work items is included.",
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
        <PullRequestsPanel />
      </div>
    </div>
  );
}
