"use client";

import { Alert, Button, DatePicker, Input, Modal } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ProjectTeam } from "@hrms/azure-devops";
import { RoadmapDiagram } from "@/features/azure/roadmap/roadmap-diagram";
import {
  hideSprintItem,
  orderedWindows,
  placeItem,
  placeSprintItem,
  scheduleItem,
  scheduleSprintItem,
  type Roadmap,
  type RoadmapWindow,
} from "@/features/azure/roadmap/roadmap";
import {
  addRoadmapItem,
  addRoadmapWindow,
  deleteRoadmapWindow,
  removeRoadmapItem,
  updateRoadmapWindow,
} from "@/features/azure/roadmap/queries";
import { roadmapTeamsQuery, type RoadmapSprintLane } from "@/features/azure/roadmap/sprints";
import { useWorkItemView } from "@/features/azure/pull-requests/work-item-view";
import { DEFAULT_DATE_FORMAT } from "@/shared/format-date";
import { SearchSelect } from "@/shared/ui";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

type RoadmapMove =
  | { op: "schedule"; itemId: string; startsOn: string; endsOn: string }
  | {
      op: "place";
      itemId: string;
      windowId: string;
      targetIndex: number;
      startsOn?: string;
      endsOn?: string;
    }
  | {
      op: "schedule-sprint";
      itemId: string;
      startsOn: string;
      endsOn: string;
      boundStart: string;
      boundEnd: string;
    }
  | {
      op: "place-sprint";
      itemId: string;
      sprintId: string;
      targetIndex: number;
      boundStart: string;
      boundEnd: string;
      startsOn?: string;
      endsOn?: string;
    }
  | { op: "hide-sprint"; itemId: string };

function layoutsFromLanes(lanes: readonly RoadmapSprintLane[]): Roadmap {
  return {
    windows: [],
    sprintLayouts: lanes.map((lane) => ({
      sprintId: lane.id,
      color: lane.color,
      hiddenWorkItemIds: lane.hiddenWorkItemIds,
      items: lane.items,
    })),
  };
}

export function RoadmapPanel({
  initialRoadmap,
  teams,
  selectedTeams,
  sprints,
  sprintError,
}: {
  initialRoadmap: Roadmap;
  teams: ProjectTeam[];
  selectedTeams: string[];
  sprints: RoadmapSprintLane[];
  sprintError: string | null;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [roadmap, setRoadmap] = useState(initialRoadmap);
  const [sprintLanes, setSprintLanes] = useState(sprints);
  const [teamsSelection, setTeamsSelection] = useState(selectedTeams);
  const sprintKey = sprints
    .map(
      (sprint) =>
        `${sprint.id}:${sprint.hiddenWorkItemIds.join(",")}:${sprint.items
          .map(
            (item) =>
              `${item.id}:${item.rank}:${item.startsOn ?? ""}:${item.endsOn ?? ""}:${item.title}:${item.type ?? ""}`,
          )
          .join(",")}`,
    )
    .join("|");
  const [appliedSprints, setAppliedSprints] = useState(sprints);
  const [appliedSprintKey, setAppliedSprintKey] = useState(sprintKey);
  if (sprints !== appliedSprints || sprintKey !== appliedSprintKey) {
    setAppliedSprints(sprints);
    setAppliedSprintKey(sprintKey);
    setSprintLanes(sprints);
  }
  const [teamPending, startTeamTransition] = useTransition();
  const selectedKey = selectedTeams.join("\u0000");
  const [appliedSelectedTeams, setAppliedSelectedTeams] = useState(selectedTeams);
  const [appliedSelectedKey, setAppliedSelectedKey] = useState(selectedKey);
  if (selectedTeams !== appliedSelectedTeams || selectedKey !== appliedSelectedKey) {
    setAppliedSelectedTeams(selectedTeams);
    setAppliedSelectedKey(selectedKey);
    setTeamsSelection(selectedTeams);
  }
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState<Dayjs | null>(null);
  const [endsOn, setEndsOn] = useState<Dayjs | null>(null);
  const [editing, setEditing] = useState<RoadmapWindow | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartsOn, setEditStartsOn] = useState<Dayjs | null>(null);
  const [editEndsOn, setEditEndsOn] = useState<Dayjs | null>(null);
  const [pending, startTransition] = useTransition();
  const windows = orderedWindows(roadmap);
  const workItemView = useWorkItemView();
  const saveQueue = useRef(Promise.resolve());
  const saveGeneration = useRef(0);
  const sprintGeneration = useRef(0);
  const roadmapRef = useRef(roadmap);
  const sprintRef = useRef(sprintLanes);

  useEffect(() => {
    roadmapRef.current = roadmap;
    sprintRef.current = sprintLanes;
  });

  function run(action: () => Promise<Roadmap>, fallback: string): void {
    setError(null);
    startTransition(async () => {
      try {
        setRoadmap(await action());
      } catch (actionError) {
        setError(errorMessage(actionError, fallback));
      }
    });
  }

  const saveMove = (mutate: (current: Roadmap) => Roadmap, body: RoadmapMove, fallback: string) => {
      const previous = roadmapRef.current;
      let next: Roadmap;
      try {
        next = mutate(previous);
      } catch (actionError) {
        setError(errorMessage(actionError, fallback));
        return;
      }
      const generation = saveGeneration.current + 1;
      saveGeneration.current = generation;
      roadmapRef.current = next;
      setError(null);
      setRoadmap(next);
      saveQueue.current = saveQueue.current
        .then(async () => {
          const response = await fetch("/api/azure/roadmap", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? fallback);
          }
        })
        .catch((actionError: unknown) => {
          if (saveGeneration.current === generation) {
            roadmapRef.current = previous;
            setRoadmap(previous);
          }
          setError(errorMessage(actionError, fallback));
        });
    };

  const saveSprint = (mutate: (lanes: readonly RoadmapSprintLane[]) => Roadmap, body: RoadmapMove, fallback: string) => {
      const previous = sprintRef.current;
      let next: Roadmap;
      try {
        next = mutate(previous);
      } catch (actionError) {
        setError(errorMessage(actionError, fallback));
        return;
      }
      const nextLanes = previous.map((lane) => {
        const layout = next.sprintLayouts.find((candidate) => candidate.sprintId === lane.id);
        return layout
          ? { ...lane, items: layout.items, hiddenWorkItemIds: layout.hiddenWorkItemIds }
          : lane;
      });
      const generation = sprintGeneration.current + 1;
      sprintGeneration.current = generation;
      sprintRef.current = nextLanes;
      setError(null);
      setSprintLanes(nextLanes);
      saveQueue.current = saveQueue.current
        .then(async () => {
          const response = await fetch("/api/azure/roadmap", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? fallback);
          }
        })
        .catch((actionError: unknown) => {
          if (sprintGeneration.current === generation) {
            sprintRef.current = previous;
            setSprintLanes(previous);
          }
          setError(errorMessage(actionError, fallback));
        });
    };

  function sprintForItem(itemId: string): RoadmapSprintLane | undefined {
    return sprintRef.current.find((lane) => lane.items.some((item) => item.id === itemId));
  }

  function updateTeams(next: readonly string[]): void {
    const names = [...next];
    setTeamsSelection(names);
    const query = roadmapTeamsQuery(names);
    startTeamTransition(() => {
      router.push(query == null ? pathname : `${pathname}?${query}`);
    });
  }

  function openEditor(windowId: string): void {
    const window = windows.find((candidate) => candidate.id === windowId);
    if (!window) {
      return;
    }
    setEditing(window);
    setEditName(window.name);
    setEditStartsOn(dayjs(window.startsOn));
    setEditEndsOn(dayjs(window.endsOn));
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert showIcon title={error} type="error" /> : null}
      {sprintError ? <Alert showIcon title={sprintError} type="warning" /> : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-64 flex-col gap-1 text-sm">
          Teams
          <SearchSelect
            allowClear
            className="min-w-64"
            disabled={teamPending}
            mode="multiple"
            options={teams.map((team) => ({ label: team.name, value: team.name }))}
            placeholder="Teams"
            value={teamsSelection}
            onChange={(value) => {
              updateTeams(Array.isArray(value) ? value.map(String) : []);
            }}
          />
        </label>
        <label className="flex min-w-48 flex-col gap-1 text-sm">
          Time frame
          <Input
            disabled={pending}
            placeholder="Release name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Start
          <DatePicker
            disabled={pending}
            format={DEFAULT_DATE_FORMAT}
            value={startsOn}
            onChange={(value) => {
              setStartsOn(value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End
          <DatePicker
            disabled={pending}
            format={DEFAULT_DATE_FORMAT}
            value={endsOn}
            onChange={(value) => {
              setEndsOn(value);
            }}
          />
        </label>
        <Button
          disabled={pending}
          type="primary"
          onClick={() => {
            if (name.trim().length === 0 || !startsOn || !endsOn) {
              setError("Name, start date, and end date are required");
              return;
            }
            const input = {
              name,
              startsOn: startsOn.format("YYYY-MM-DD"),
              endsOn: endsOn.format("YYYY-MM-DD"),
            };
            run(async () => {
              const next = await addRoadmapWindow(input);
              setName("");
              setStartsOn(null);
              setEndsOn(null);
              return next;
            }, "Could not add the time frame.");
          }}
        >
          Add time frame
        </Button>
      </div>
      <RoadmapDiagram
        pending={pending}
        sprints={sprintLanes}
        windows={windows}
        onAddItem={(windowId, rawId) => {
          run(
            () => addRoadmapItem(windowId, rawId),
            "Could not add the work item.",
          );
        }}
        onDeleteWindow={(windowId) => {
          run(() => deleteRoadmapWindow(windowId), "Could not delete the time frame.");
        }}
        onEditWindow={openEditor}
        onUpdateWindow={(windowId, input) => {
          run(() => updateRoadmapWindow(windowId, input), "Could not update the time frame.");
        }}
        onOpenItem={(workItemId) => {
          void workItemView.openView(workItemId);
        }}
        onPlaceItem={(itemId, windowId, targetIndex, range) => {
          const sprint = sprintForItem(itemId);
          if (sprint) {
            saveSprint(
              (lanes) =>
                placeSprintItem(
                  layoutsFromLanes(lanes),
                  itemId,
                  sprint.id,
                  targetIndex,
                  { startsOn: sprint.startsOn, endsOn: sprint.endsOn },
                  range,
                ),
              {
                op: "place-sprint",
                itemId,
                sprintId: sprint.id,
                targetIndex,
                boundStart: sprint.startsOn,
                boundEnd: sprint.endsOn,
                startsOn: range?.startsOn,
                endsOn: range?.endsOn,
              },
              "Could not move the work item.",
            );
            return;
          }
          saveMove(
            (current) => placeItem(current, itemId, windowId, targetIndex, range),
            {
              op: "place",
              itemId,
              windowId,
              targetIndex,
              startsOn: range?.startsOn,
              endsOn: range?.endsOn,
            },
            "Could not move the work item.",
          );
        }}
        onScheduleItem={(itemId, startsOn, endsOn) => {
          const sprint = sprintForItem(itemId);
          if (sprint) {
            saveSprint(
              (lanes) =>
                scheduleSprintItem(layoutsFromLanes(lanes), itemId, startsOn, endsOn, {
                  startsOn: sprint.startsOn,
                  endsOn: sprint.endsOn,
                }),
              {
                op: "schedule-sprint",
                itemId,
                startsOn,
                endsOn,
                boundStart: sprint.startsOn,
                boundEnd: sprint.endsOn,
              },
              "Could not change the work item dates.",
            );
            return;
          }
          saveMove(
            (current) => scheduleItem(current, itemId, startsOn, endsOn),
            { op: "schedule", itemId, startsOn, endsOn },
            "Could not change the work item dates.",
          );
        }}
        onRemoveItem={(itemId) => {
          if (sprintForItem(itemId)) {
            saveSprint(
              (lanes) => hideSprintItem(layoutsFromLanes(lanes), itemId),
              { op: "hide-sprint", itemId },
              "Could not remove the work item.",
            );
            return;
          }
          run(() => removeRoadmapItem(itemId), "Could not remove the work item.");
        }}
      />
      {workItemView.modal}
      <Modal
        destroyOnHidden
        okText="Save"
        open={editing != null}
        title="Edit time frame"
        confirmLoading={pending}
        onCancel={() => {
          setEditing(null);
        }}
        onOk={() => {
          if (!editing) {
            return;
          }
          if (editName.trim().length === 0 || !editStartsOn || !editEndsOn) {
            setError("Name, start date, and end date are required");
            return;
          }
          const windowId = editing.id;
          const input = {
            name: editName,
            startsOn: editStartsOn.format("YYYY-MM-DD"),
            endsOn: editEndsOn.format("YYYY-MM-DD"),
          };
          run(async () => {
            const next = await updateRoadmapWindow(windowId, input);
            setEditing(null);
            return next;
          }, "Could not update the time frame.");
        }}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Time frame
            <Input
              value={editName}
              onChange={(event) => {
                setEditName(event.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Start
            <DatePicker
              format={DEFAULT_DATE_FORMAT}
              value={editStartsOn}
              onChange={(value) => {
                setEditStartsOn(value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            End
            <DatePicker
              format={DEFAULT_DATE_FORMAT}
              value={editEndsOn}
              onChange={(value) => {
                setEditEndsOn(value);
              }}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
