import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { TeamIteration, TeamIterationTimeframe } from "@hrms/azure-devops";
import { DEFAULT_BOARD_TEAM } from "@/features/azure/board/defaults";
import type { RoadmapItem } from "@/features/azure/roadmap/roadmap";

dayjs.extend(utc);

export type RoadmapSprintItem = {
  id: number;
  title: string;
  type: string;
  state: string;
};

export type RoadmapSprint = {
  id: string;
  team: string;
  name: string;
  path: string;
  timeFrame: TeamIterationTimeframe | null;
  startsOn: string;
  endsOn: string;
  items: RoadmapSprintItem[];
};

/** Active sprint after Backstage rank and dates are applied. */
export type RoadmapSprintLane = Omit<RoadmapSprint, "items"> & {
  color: string;
  hiddenWorkItemIds: number[];
  items: RoadmapItem[];
};

export type SprintScheduleDates = {
  reportedOn: string | null;
  plannedReleaseOn: string | null;
};

type SprintDraft = Omit<RoadmapSprint, "team" | "items">;

function toDateOnly(value: string | null): string | null {
  if (value == null || value.length === 0) {
    return null;
  }
  const parsed = dayjs.utc(value);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.format("YYYY-MM-DD");
}

function datedSprint(iteration: TeamIteration): SprintDraft | null {
  const startsOn = toDateOnly(iteration.startDate);
  const endsOn = toDateOnly(iteration.finishDate);
  if (startsOn == null || endsOn == null || endsOn < startsOn) {
    return null;
  }
  return {
    id: iteration.id,
    name: iteration.name,
    path: iteration.path,
    timeFrame: iteration.timeFrame,
    startsOn,
    endsOn,
  };
}

function byLatest(left: RoadmapSprint, right: RoadmapSprint): number {
  const byStartDate = right.startsOn.localeCompare(left.startsOn);
  if (byStartDate !== 0) {
    return byStartDate;
  }
  const byEnd = right.endsOn.localeCompare(left.endsOn);
  if (byEnd !== 0) {
    return byEnd;
  }
  return right.name.localeCompare(left.name);
}

/** The active sprint for each selected team. Past and future sprints stay off the roadmap. */
export function activeSprints(
  teams: readonly { team: string; iterations: readonly TeamIteration[] }[],
): RoadmapSprint[] {
  const byPath = new Map<string, RoadmapSprint>();
  for (const { team, iterations } of teams) {
    for (const iteration of iterations) {
      const sprint = datedSprint(iteration);
      if (sprint == null || sprint.timeFrame !== "current") {
        continue;
      }
      if (byPath.has(sprint.path)) {
        continue;
      }
      byPath.set(sprint.path, { ...sprint, team, items: [] });
    }
  }
  return [...byPath.values()].sort(byLatest);
}

const CHILD_WORK_ITEM_TYPES = new Set(["Task", "Bug", "Test Case"]);

type SprintWorkItem = RoadmapSprintItem & {
  parentId: number | null;
};

/**
 * Parent work items for a sprint row.
 * Tasks, bugs, and test cases are children. A parent that is itself under
 * another item in this sprint stays hidden too.
 */
export function roadmapSprintItems(items: readonly SprintWorkItem[]): RoadmapSprintItem[] {
  const ids = new Set(items.map((item) => item.id));
  return items
    .filter((item) => !CHILD_WORK_ITEM_TYPES.has(item.type))
    .filter((item) => item.parentId == null || !ids.has(item.parentId))
    .map(({ id, title, type, state }) => ({ id, title, type, state }))
    .sort((left, right) => left.id - right.id);
}

/**
 * Reported Date is the start. Planned Release Date is the end.
 * A missing planned date uses the sprint finish. A missing reported date uses the sprint start.
 * When the planned date is before the reported date, the bar is that single day.
 */
export function sprintItemDates(
  reportedOn: string | null | undefined,
  plannedReleaseOn: string | null | undefined,
  sprint: { startsOn: string; endsOn: string },
): { startsOn: string; endsOn: string } {
  const startsOn = reportedOn && reportedOn.length > 0 ? reportedOn : sprint.startsOn;
  let endsOn = plannedReleaseOn && plannedReleaseOn.length > 0 ? plannedReleaseOn : sprint.endsOn;
  if (endsOn < startsOn) {
    endsOn = startsOn;
  }
  return { startsOn, endsOn };
}

/**
 * Saved Backstage dates win. Otherwise the bar uses Azure dates and is not written back.
 * No Azure record leaves the item undated.
 */
export function withSprintSchedule(
  item: RoadmapItem,
  sprint: { startsOn: string; endsOn: string },
  azure: SprintScheduleDates | undefined,
): RoadmapItem {
  if (item.startsOn && item.endsOn) {
    return item;
  }
  if (!azure) {
    return item;
  }
  return { ...item, ...sprintItemDates(azure.reportedOn, azure.plannedReleaseOn, sprint) };
}

/** Missing `teams` opens on Team Sprinter. An empty value means no sprint lanes. */
export function resolveRoadmapTeams(
  value: string | string[] | undefined,
  defaultTeam: string = DEFAULT_BOARD_TEAM,
): string[] {
  if (value === undefined) {
    return [defaultTeam];
  }
  const entries = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const teams: string[] = [];
  for (const entry of entries) {
    const name = entry.trim();
    if (name.length === 0 || seen.has(name)) {
      continue;
    }
    seen.add(name);
    teams.push(name);
  }
  return teams;
}

/**
 * Query string for the team multi-select.
 * Only Team Sprinter omits the param. No teams is `teams=`.
 */
export function roadmapTeamsQuery(
  teams: readonly string[],
  defaultTeam: string = DEFAULT_BOARD_TEAM,
): string | null {
  if (teams.length === 1 && teams[0] === defaultTeam) {
    return null;
  }
  const params = new URLSearchParams();
  if (teams.length === 0) {
    params.set("teams", "");
  } else {
    for (const team of teams) {
      params.append("teams", team);
    }
  }
  return params.toString();
}
