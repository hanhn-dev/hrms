import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import {
  IterationWorkItemsSlot,
  IterationsSlot,
} from "@/features/azure/sprints/sprints-slots";
import type { TeamIterationTimeframe } from "@hrms/azure-devops";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

export type SprintsScreenFilters = {
  iterationPath?: string;
  team?: string;
  timeFrame?: TeamIterationTimeframe;
  from?: string;
  to?: string;
  pathPrefix?: string;
  q?: string;
};

export async function SprintsScreen({
  iterationPath,
  team,
  timeFrame,
  from,
  to,
  pathPrefix,
  q,
}: SprintsScreenFilters): Promise<React.JSX.Element> {
  return (
    <div className="h-screen overflow-y-auto">
      <div className="w-full min-w-0 p-4 md:p-6">
        <PageHeader extra={<AzureNav active="sprints" />} title="Sprints" />
        <Suspense fallback={<SectionFallback title="Sprints" />}>
          <IterationsSlot
            from={from}
            pathPrefix={pathPrefix}
            q={q}
            selectedIterationPath={iterationPath}
            team={team}
            timeFrame={timeFrame}
            to={to}
          />
        </Suspense>
        {iterationPath ? (
          <Suspense fallback={<SectionFallback title="Work items" />}>
            <IterationWorkItemsSlot iterationPath={iterationPath} query={q} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
