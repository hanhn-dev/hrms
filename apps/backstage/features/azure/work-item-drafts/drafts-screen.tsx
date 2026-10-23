import { AzureNav } from "@/features/azure/azure-nav";
import { WorkItemDraftsPanel } from "@/features/azure/work-item-drafts/drafts-panel";
import { listDrafts } from "@/features/azure/work-item-drafts/drafts";
import { PageHeader } from "@/shared/ui/page-header";

const HELP = [
  {
    id: "review",
    type: "info" as const,
    title: "Review before Azure DevOps",
    description:
      "Drafts are written by /improve-sql-performance. Open a row to read the investigation, proposed rewrite, comparison, and concrete solution. Publish creates a Product Backlog Item in Azure DevOps; Reject leaves it local only.",
  },
];

export async function WorkItemDraftsScreen(): Promise<React.JSX.Element> {
  const drafts = listDrafts();
  return (
    <div className="h-screen overflow-y-auto">
      <div className="w-full min-w-0 p-4 md:p-6">
        <PageHeader
          extra={<AzureNav active="work-item-drafts" />}
          notes={HELP}
          title="Work item drafts"
        />
        <WorkItemDraftsPanel initialDrafts={drafts} />
      </div>
    </div>
  );
}
