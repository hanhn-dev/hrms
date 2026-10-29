import type { TeamIteration } from "@hrms/azure-devops";
import { BoardPanel, type BoardView } from "@/features/azure/board/board-panel";
import { DEFAULT_BOARD_TEAM, SPRINT_WORK_ITEM_CAP } from "@/features/azure/board/defaults";
import { groupBoard, sprintSummary } from "@/features/azure/board/group-board";
import {
  listIterations,
  listMembers,
  listTeams,
  loadSprintBoard,
} from "@/features/azure/board/queries";

export async function BoardSlot({
  team,
  iteration,
  assignees,
  types,
  query,
  view,
  showSummary,
}: {
  team?: string;
  iteration?: string;
  assignees: string[];
  types: string[];
  query?: string;
  view: BoardView;
  showSummary: boolean;
}): Promise<React.JSX.Element> {
  const resolvedTeam = team?.trim() || DEFAULT_BOARD_TEAM;
  const [teams, iterations, members] = await Promise.all([
    listTeams(),
    listIterations(resolvedTeam),
    listMembers(resolvedTeam),
  ]);
  const current = iterations.find((item) => item.timeFrame === "current") ?? null;
  const requested = iteration?.trim() ?? "";
  const selected: TeamIteration | null =
    requested.length > 0
      ? (iterations.find((item) => item.path === requested) ?? null)
      : current;
  const loaded = selected
    ? await loadSprintBoard(resolvedTeam, selected.id, selected.path, {
        query,
        assignees,
        types,
      })
    : null;
  const model = groupBoard({
    workItems: loaded?.workItems ?? [],
    columns: loaded?.columns ?? [],
    placements: loaded?.placements ?? [],
    members,
    assignees,
    types,
    parents: loaded?.parents ?? [],
    query,
  });
  const workItemTypes = [
    ...new Set((loaded?.workItems ?? []).map((item) => item.type)),
  ].sort((left, right) => left.localeCompare(right));

  return (
    <BoardPanel
      assignees={assignees}
      currentIterationPath={current?.path}
      iterations={iterations}
      members={members}
      missingIteration={requested.length > 0 && selected == null}
      model={model}
      query={query}
      selected={selected}
      showSummary={showSummary}
      summary={sprintSummary(loaded?.workItems ?? [])}
      team={resolvedTeam}
      teams={teams}
      truncated={!query?.trim() && (loaded?.workItems.length ?? 0) >= SPRINT_WORK_ITEM_CAP}
      types={types}
      view={view}
      workItemTypes={workItemTypes}
    />
  );
}
