import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import { ProgressSlot } from "@/features/azure/progress/progress-slots";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

const HELP = [
  {
    id: "teams",
    type: "info" as const,
    title: "Local teams",
    description:
      "Select a local team created under Teams. Its members fill automatically for sprint progress and velocity. Manage members on the Teams page — lists stay in Backstage and are not written to Azure DevOps.",
  },
  {
    id: "people",
    type: "info" as const,
    title: "People board",
    description:
      "Each person starts collapsed with active/done counts and a progress bar. Expand a row (or use Expand all) to see their status columns. Tasks and bugs wrap under their Product Backlog Item even when that PBI is assigned to someone else — only that person's children are listed.",
  },
  {
    id: "counts",
    type: "info" as const,
    title: "Completed counts",
    description:
      "Done, Closed, and Resolved count as completed. Each sprint loads at most 200 work items; a warning icon appears next to the sprint selector if that cap is hit — click it for details. People-board columns stay team-wide, and a PBI with an active child task is placed under that child state.",
  },
];

export function ProgressScreen({
  teamId,
  sprint,
}: {
  teamId: string | null;
  sprint?: string;
}): React.JSX.Element {
  return (
    <div className="h-screen overflow-y-auto">
      <div className="w-full min-w-0 p-4 md:p-6">
        <PageHeader
          extra={<AzureNav active="progress" />}
          notes={HELP}
          title="Team progress"
        />
        <Suspense fallback={<SectionFallback title="Team progress" />}>
          <ProgressSlot sprint={sprint} teamId={teamId} />
        </Suspense>
      </div>
    </div>
  );
}
