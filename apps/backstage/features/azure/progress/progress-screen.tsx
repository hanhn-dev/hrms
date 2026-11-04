import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import type {
  ProgressPrMode,
  ProgressPrPreset,
} from "@/features/azure/progress/progress-pr-range";
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
  {
    id: "stale",
    type: "info" as const,
    title: "Needs attention",
    description:
      "Items stuck in the same Azure DevOps status past your threshold (or Blocked) appear in Needs attention. Age is days since the last state change, not the last edit. The threshold is saved in this browser and is shared with the Sprint board; optional ?staleDays= overrides it for a link. Copy reminder builds a message you can paste to the assignee.",
  },
  {
    id: "pull-requests",
    type: "info" as const,
    title: "Pull requests created",
    description:
      "Counts PRs each team member opened in the period (by author), not PRs linked to sprint work items. Quick mode defaults to Last week and also offers Last 2 weeks, Last 3 weeks, Last month, and Last 3 months. Sprint mode uses the selected iteration’s dates; Custom mode uses ?prFrom=&prTo=. Members are matched to Azure DevOps identities by display name. Click a row or Opened count to list that person’s PRs.",
  },
];

export function ProgressScreen({
  teamId,
  sprint,
  prMode,
  prPreset,
  prFrom,
  prTo,
}: {
  teamId: string | null;
  sprint?: string;
  prMode: ProgressPrMode;
  prPreset: ProgressPrPreset;
  prFrom: string | null;
  prTo: string | null;
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
          <ProgressSlot
            prFrom={prFrom}
            prMode={prMode}
            prPreset={prPreset}
            prTo={prTo}
            sprint={sprint}
            teamId={teamId}
          />
        </Suspense>
      </div>
    </div>
  );
}
