import { Card } from "antd";
import { IterationWorkItemsTable } from "@/features/azure/sprints/iteration-work-items-table";
import { SprintsPanel } from "@/features/azure/sprints/sprints-panel";
import {
  getConfiguredTeamName,
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
  const [teams, iterations, defaultTeam] = await Promise.all([
    listTeams(),
    listIterations({ team }),
    getConfiguredTeamName(),
  ]);

  return (
    <Card className="mb-4" title="Sprints">
      <SprintsPanel
        defaultTeam={defaultTeam}
        from={from}
        iterations={iterations}
        pathPrefix={pathPrefix}
        q={q}
        selectedIterationPath={selectedIterationPath}
        team={team}
        teams={teams}
        timeFrame={timeFrame}
        to={to}
      />
    </Card>
  );
}

export async function IterationWorkItemsSlot({
  iterationPath,
}: {
  iterationPath: string;
}): Promise<React.JSX.Element> {
  const workItems = await listIterationWorkItems(iterationPath);
  return (
    <Card title={`Work items — ${iterationPath}`}>
      <IterationWorkItemsTable workItems={workItems} />
    </Card>
  );
}
