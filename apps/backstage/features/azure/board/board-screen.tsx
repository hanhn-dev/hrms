import { Suspense } from "react";
import { AzureNav } from "@/features/azure/azure-nav";
import { BoardSlot } from "@/features/azure/board/board-slots";
import type { BoardView } from "@/features/azure/board/board-panel";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";

export type BoardScreenFilters = {
  team?: string;
  iteration?: string;
  assignees: string[];
  types: string[];
  query?: string;
  view: BoardView;
  showSummary: boolean;
};

export function BoardScreen({
  team,
  iteration,
  assignees,
  types,
  query,
  view,
  showSummary,
}: BoardScreenFilters): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col p-4 md:p-6">
        <PageHeader extra={<AzureNav active="board" />} title="Sprint board" />
        <div className="min-h-0 min-w-0 flex-1">
          <Suspense fallback={<SectionFallback title="Sprint board" />}>
            <BoardSlot
              assignees={assignees}
              iteration={iteration}
              query={query}
              showSummary={showSummary}
              team={team}
              types={types}
              view={view}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
