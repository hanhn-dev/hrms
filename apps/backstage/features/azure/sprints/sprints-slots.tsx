import { Card, Tag } from "antd";
import Link from "next/link";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import { IterationWorkItemsCards } from "@/features/azure/sprints/iteration-work-items-cards";
import {
  boardHref,
  iterationLeafName,
  sprintsClearHref,
} from "@/features/azure/sprints/sprint-links";
import { summarizeSprintTrees } from "@/features/azure/sprints/sprint-summary";
import { SprintsPanel } from "@/features/azure/sprints/sprints-panel";
import { buildSprintWorkItemTrees } from "@/features/azure/sprints/sprint-work-item-tree";
import {
  listIterationWorkItems,
  listIterations,
  listTeams,
  type TeamIterationTimeframe,
} from "@/features/azure/sprints/queries";
import { Text } from "@/shared/ui";

function formatEffort(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

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
    <Card className="mb-0" title="Sprints">
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
  team,
  filterQuery,
}: {
  iterationPath: string;
  query?: string;
  team?: string;
  filterQuery?: Record<string, string | undefined>;
}): Promise<React.JSX.Element> {
  const workItems = await listIterationWorkItems(iterationPath, query);
  const resolvedTeam = team?.trim() || DEFAULT_BOARD_TEAM;
  const leafName = iterationLeafName(iterationPath);
  const summary = summarizeSprintTrees(buildSprintWorkItemTrees(workItems));

  return (
    <Card
      extra={
        <span className="inline-flex items-center gap-3 text-sm">
          <Link href={boardHref(iterationPath, resolvedTeam)}>Open board</Link>
          <Link href={sprintsClearHref(filterQuery)}>Clear</Link>
        </span>
      }
      title={
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium">{leafName}</span>
            <Tag color="blue">{summary.pbiCount} PBIs</Tag>
            <Tag color="red">{summary.bugCount} Bugs</Tag>
            {summary.featureCount > 0 ? (
              <Tag color="purple">{summary.featureCount} Features</Tag>
            ) : null}
            <Tag color="geekblue">Effort {formatEffort(summary.totalEffort)}</Tag>
          </div>
          {leafName !== iterationPath ? (
            <Text className="text-xs font-normal" type="secondary">
              {iterationPath}
            </Text>
          ) : null}
        </div>
      }
    >
      <IterationWorkItemsCards workItems={workItems} />
    </Card>
  );
}
