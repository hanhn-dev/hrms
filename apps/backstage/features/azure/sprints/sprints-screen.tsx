import { Suspense } from "react";
import { Card } from "antd";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import { AzureNav } from "@/features/azure/azure-nav";
import {
  IterationWorkItemsSlot,
  IterationsSlot,
} from "@/features/azure/sprints/sprints-slots";
import type { TeamIterationTimeframe } from "@hrms/azure-devops";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { Text } from "@/shared/ui";

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
  const filterQuery = {
    team: team && team !== DEFAULT_BOARD_TEAM ? team : undefined,
    timeFrame,
    from,
    to,
    path: pathPrefix,
    q,
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 md:px-6 md:pt-6">
        <PageHeader extra={<AzureNav active="sprints" />} title="Sprints" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 md:flex-row md:px-6 md:pb-6">
        <div
          className={
            iterationPath
              ? "order-2 min-h-0 min-w-0 flex-1 overflow-y-auto md:order-1 md:w-[min(28rem,40%)] md:flex-none"
              : "min-h-0 min-w-0 flex-1 overflow-y-auto md:w-[min(28rem,40%)] md:flex-none"
          }
        >
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
        </div>
        <div
          className={
            iterationPath
              ? "order-1 min-h-0 min-w-0 flex-1 overflow-y-auto md:order-2"
              : "order-2 min-h-0 min-w-0 flex-1 overflow-y-auto md:order-2"
          }
        >
          {iterationPath ? (
            <Suspense fallback={<SectionFallback title="Work items" />}>
              <IterationWorkItemsSlot
                filterQuery={filterQuery}
                iterationPath={iterationPath}
                query={q}
                team={team}
              />
            </Suspense>
          ) : (
            <Card className="h-full" title="Work items">
              <Text type="secondary">Select a sprint to view work items.</Text>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
