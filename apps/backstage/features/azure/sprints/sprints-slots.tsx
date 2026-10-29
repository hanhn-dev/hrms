import { Card } from "antd";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import { IterationWorkItemsTable } from "@/features/azure/sprints/iteration-work-items-table";
import { SprintsPanel } from "@/features/azure/sprints/sprints-panel";
import {
  listIterationWorkItems,
  listIterations,
  listTeams,
  type TeamIterationTimeframe,
} from "@/features/azure/sprints/queries";

export async function IterationsSlot({
  selectedIterationPath,
  team,
  timeFrame,
  from,
  to,
  pathPrefix,
  q,
}: {
  selectedIterationPath?: string;
  team?: string;
  timeFrame?: TeamIterationTimeframe;
  from?: string;
  to?: string;
  pathPrefix?: string;
  q?: string;
}): Promise<React.JSX.Element> {
  // timeFrame is filtered client-side — ADO $timeframe only accepts "current".
  const resolvedTeam = team?.trim() || DEFAULT_BOARD_TEAM;
  const [teams, iterations] = await Promise.all([
    listTeams(),
    listIterations({ team: resolvedTeam }),
  ]);

  return (
    <Card className="mb-4" title="Sprints">
      <SprintsPanel
        defaultTeam={DEFAULT_BOARD_TEAM}
        from={from}
        iterations={iterations}
        pathPrefix={pathPrefix}
        q={q}
        selectedIterationPath={selectedIterationPath}
        team={resolvedTeam}
        teams={teams}
        timeFrame={timeFrame}
        to={to}
      />
    </Card>
  );
}

export async function IterationWorkItemsSlot({
  iterationPath,
  query,
}: {
  iterationPath: string;
  query?: string;
}): Promise<React.JSX.Element> {
  const workItems = await listIterationWorkItems(iterationPath, query);
  return (
    <Card title={`Work items — ${iterationPath}`}>
      <IterationWorkItemsTable workItems={workItems} />
    </Card>
  );
}
