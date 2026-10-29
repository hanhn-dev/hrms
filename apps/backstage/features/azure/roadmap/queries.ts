"use server";

import {
  getIterationWorkItems,
  getWorkItem,
  getWorkItemScheduleDates,
  getWorkItemsByIds,
  listProjectTeams,
  listTeamIterations,
  type ProjectTeam,
  type TeamIteration,
} from "@hrms/azure-devops";
import {
  createItem,
  createWindow,
  deleteWindow,
  mergeSprintLayout,
  nextLaneColor,
  usedLaneColors,
  placeItem,
  removeItem,
  saveSprintLayout,
  scheduleItem,
  updateWindow,
  type Roadmap,
  type RoadmapWindowInput,
} from "@/features/azure/roadmap/roadmap";
import { readRoadmap, writeRoadmap } from "@/features/azure/roadmap/roadmap-store";
import {
  activeSprints,
  roadmapSprintItems,
  withSprintSchedule,
  type RoadmapSprint,
  type RoadmapSprintLane,
} from "@/features/azure/roadmap/sprints";
import { requireFeature } from "@/shared/auth";
import { getAzureDevOpsClient } from "@/shared/azure/client";

function save(next: Roadmap): Roadmap {
  writeRoadmap(next);
  return next;
}

function parseWorkItemId(raw: string): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Enter a work item id");
  }
  const workItemId = Number(trimmed);
  if (!Number.isSafeInteger(workItemId) || workItemId <= 0) {
    throw new Error("Enter a work item id");
  }
  return workItemId;
}

export type RoadmapSprintLoad = {
  sprints: RoadmapSprintLane[];
  error: string | null;
};

function failureText(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Could not load sprints";
}

export async function listRoadmapTeams(): Promise<ProjectTeam[]> {
  await requireFeature("azure");
  return listProjectTeams(getAzureDevOpsClient());
}

export async function loadRoadmapSprintLanes(teams: readonly string[]): Promise<RoadmapSprintLoad> {
  await requireFeature("azure");
  if (teams.length === 0) {
    return { sprints: [], error: null };
  }
  const client = getAzureDevOpsClient();
  const settled = await Promise.allSettled(
    teams.map(async (team) => {
      const iterations: TeamIteration[] = await listTeamIterations(client, undefined, team);
      return { team, iterations };
    }),
  );
  const loaded: { team: string; iterations: TeamIteration[] }[] = [];
  const errors: string[] = [];
  settled.forEach((result, index) => {
    const team = teams[index] ?? "team";
    if (result.status === "fulfilled") {
      loaded.push(result.value);
      return;
    }
    errors.push(`${team}: ${failureText(result.reason)}`);
  });
  const selected = activeSprints(loaded);
  const withItems = await Promise.allSettled(
    selected.map(async (sprint) => {
      const workItems = await getIterationWorkItems(client, sprint.path, client.config);
      return {
        ...sprint,
        items: roadmapSprintItems(workItems),
      };
    }),
  );
  const sprints: RoadmapSprint[] = [];
  const failed = new Set<string>();
  withItems.forEach((result, index) => {
    const sprint = selected[index];
    if (!sprint) {
      return;
    }
    if (result.status === "fulfilled") {
      sprints.push(result.value);
      return;
    }
    errors.push(`${sprint.name}: ${failureText(result.reason)}`);
    failed.add(sprint.id);
    sprints.push(sprint);
  });
  let roadmap = readRoadmap();
  let changed = false;
  const usedColors = usedLaneColors(roadmap);
  const parentIds = sprints
    .filter((sprint) => !failed.has(sprint.id))
    .flatMap((sprint) => sprint.items.map((item) => item.id));
  let scheduleDates = new Map<number, { reportedOn: string | null; plannedReleaseOn: string | null }>();
  if (parentIds.length > 0) {
    try {
      scheduleDates = await getWorkItemScheduleDates(client, parentIds);
    } catch (error) {
      errors.push(failureText(error));
    }
  }
  const lanes: RoadmapSprintLane[] = [];
  for (const sprint of sprints) {
    const saved = roadmap.sprintLayouts.find((layout) => layout.sprintId === sprint.id);
    if (failed.has(sprint.id)) {
      const color = saved?.color ?? nextLaneColor(usedColors);
      if (!usedColors.includes(color)) {
        usedColors.push(color);
      }
      lanes.push({
        ...sprint,
        color,
        hiddenWorkItemIds: saved?.hiddenWorkItemIds ?? [],
        items: saved?.items ?? [],
      });
      continue;
    }
    const merged = mergeSprintLayout(
      saved,
      sprint.id,
      sprint.items.map((item) => ({ id: item.id, title: item.title, type: item.type })),
      { startsOn: sprint.startsOn, endsOn: sprint.endsOn },
      () => crypto.randomUUID(),
      usedColors,
    );
    if (merged.layout.color && !usedColors.includes(merged.layout.color)) {
      usedColors.push(merged.layout.color);
    }
    if (merged.changed) {
      roadmap = saveSprintLayout(roadmap, merged.layout);
      changed = true;
    }
    lanes.push({
      ...sprint,
      color: merged.layout.color ?? nextLaneColor(usedColors),
      hiddenWorkItemIds: merged.layout.hiddenWorkItemIds,
      items: merged.layout.items.map((item) =>
        withSprintSchedule(item, sprint, scheduleDates.get(item.workItemId)),
      ),
    });
  }
  if (changed) {
    writeRoadmap(roadmap);
  }
  return {
    sprints: lanes,
    error: errors.length > 0 ? errors.join(" ") : null,
  };
}

export async function loadRoadmap(): Promise<Roadmap> {
  await requireFeature("azure");
  const roadmap = readRoadmap();
  const ids = [
    ...new Set(roadmap.windows.flatMap((window) => window.items.map((item) => item.workItemId))),
  ];
  if (ids.length === 0) {
    return roadmap;
  }
  try {
    const batch = await getWorkItemsByIds(getAzureDevOpsClient(), ids.join(","));
    const details = new Map<number, { title: string; type: string }>();
    for (const entry of batch.results) {
      if (entry.status === "found" && entry.workItem) {
        details.set(entry.workItem.id, {
          title: entry.workItem.title,
          type: entry.workItem.type,
        });
      }
    }
    let changed = false;
    const next: Roadmap = {
      sprintLayouts: roadmap.sprintLayouts,
      windows: roadmap.windows.map((window) => ({
        ...window,
        items: window.items.map((item) => {
          const detail = details.get(item.workItemId);
          if (!detail) {
            return item;
          }
          const type = detail.type.trim();
          if (detail.title === item.title && type === (item.type ?? "")) {
            return item;
          }
          changed = true;
          return { ...item, title: detail.title, ...(type ? { type } : {}) };
        }),
      })),
    };
    if (!changed) {
      return roadmap;
    }
    return save(next);
  } catch {
    return roadmap;
  }
}

export async function loadSavedRoadmap(): Promise<Roadmap> {
  await requireFeature("azure");
  return readRoadmap();
}

export async function addRoadmapWindow(input: RoadmapWindowInput): Promise<Roadmap> {
  await requireFeature("azure");
  return save(createWindow(readRoadmap(), input));
}

export async function updateRoadmapWindow(
  windowId: string,
  input: RoadmapWindowInput,
): Promise<Roadmap> {
  await requireFeature("azure");
  return save(updateWindow(readRoadmap(), windowId, input));
}

export async function deleteRoadmapWindow(windowId: string): Promise<Roadmap> {
  await requireFeature("azure");
  return save(deleteWindow(readRoadmap(), windowId));
}

export async function addRoadmapItem(windowId: string, rawId: string): Promise<Roadmap> {
  await requireFeature("azure");
  const workItemId = parseWorkItemId(rawId);
  let title: string;
  let type = "";
  try {
    const workItem = await getWorkItem(getAzureDevOpsClient(), workItemId);
    title = workItem.title;
    type = workItem.type;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("not found")) {
      throw new Error(`Work item ${workItemId} was not found in Azure DevOps`);
    }
    throw error instanceof Error ? error : new Error("Could not reach Azure DevOps");
  }
  return save(createItem(readRoadmap(), windowId, { workItemId, title, type }));
}

export async function removeRoadmapItem(itemId: string): Promise<Roadmap> {
  await requireFeature("azure");
  return save(removeItem(readRoadmap(), itemId));
}

export async function scheduleRoadmapItem(
  itemId: string,
  startsOn: string,
  endsOn: string,
): Promise<Roadmap> {
  await requireFeature("azure");
  return save(scheduleItem(readRoadmap(), itemId, startsOn, endsOn));
}

export async function placeRoadmapItem(
  itemId: string,
  windowId: string,
  targetIndex: number,
  range?: { startsOn: string; endsOn: string },
): Promise<Roadmap> {
  await requireFeature("azure");
  return save(placeItem(readRoadmap(), itemId, windowId, targetIndex, range));
}
