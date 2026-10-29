"use client";

import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { App, Button, DatePicker, Dropdown, Empty, Input, Modal, Popconfirm, Popover } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { workItemTypeBarColor } from "@/features/azure/board/work-item-appearance";
import {
  addDays,
  barPercent,
  datesInMonth,
  daySpan,
  daysFromPixels,
  fitRange,
  itemRange,
  resizeEdge,
  timelineMonths,
  type RoadmapItem,
  type RoadmapWindow,
  type RoadmapWindowInput,
  type TimelineMonth,
} from "@/features/azure/roadmap/roadmap";
import type { RoadmapSprintLane } from "@/features/azure/roadmap/sprints";
import { DEFAULT_DATE_FORMAT, formatDate } from "@/shared/format-date";

const LABEL_WIDTH = "18rem";
const DAY_WIDTH = 6;

function monthColumnStyle(days: number): React.CSSProperties {
  return { flexGrow: days, flexShrink: 1, flexBasis: 0 };
}

function MonthGrid({ months }: { months: readonly TimelineMonth[] }): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 flex">
      {months.map((month) => (
        <div
          key={month.key}
          className="border-l border-slate-200/80 dark:border-slate-700/80"
          style={monthColumnStyle(month.days)}
        />
      ))}
    </div>
  );
}

function DayDots({ months }: { months: readonly TimelineMonth[] }): React.JSX.Element {
  return (
    <div className="absolute inset-0 z-0 flex">
      {months.map((month) => (
        <div key={month.key} className="flex h-full" style={monthColumnStyle(month.days)}>
          {datesInMonth(month).map((day) => (
            <span
              key={day}
              className="group flex h-full min-w-0 flex-1 items-center justify-center"
              title={formatDate(day)}
            >
              <span className="size-1 shrink-0 rounded-full bg-slate-300 transition-all duration-150 group-hover:scale-150 group-hover:bg-slate-500 dark:bg-slate-600 dark:group-hover:bg-slate-300" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function MonthHeading({ month }: { month: TimelineMonth }): React.JSX.Element {
  return (
    <div
      className="border-l border-slate-200 px-1 py-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400"
      style={monthColumnStyle(month.days)}
    >
      {month.label}
    </div>
  );
}

type ItemRange = { startsOn: string; endsOn: string };

type Lift = {
  itemId: string;
  left: number;
  top: number;
  width: number;
};

function rangeFromClient(
  clientX: number,
  pointerOffset: number,
  drag: ItemRange,
  chart: HTMLElement,
  axisStart: string,
  axisEnd: string,
  boundStart: string,
  boundEnd: string,
): ItemRange {
  const rect = chart.getBoundingClientRect();
  const left = clientX - pointerOffset - rect.left;
  const startsOn = addDays(axisStart, daysFromPixels(left, rect.width, axisStart, axisEnd));
  const endsOn = addDays(startsOn, daySpan(drag.startsOn, drag.endsOn));
  return fitRange(startsOn, endsOn, boundStart, boundEnd);
}

const WorkItemBar = function WorkItemBar({
  item,
  lane,
  color,
  left,
  width,
  pending,
  axisStart,
  axisEnd,
  lifted,
  clampToLane,
  onOpen,
  onRemove,
  onSchedule,
  onPreview,
  onMoveStart,
}: {
  item: RoadmapItem;
  lane: RoadmapWindow;
  color: string;
  left: number;
  width: number;
  pending: boolean;
  axisStart: string;
  axisEnd: string;
  lifted: Lift | null;
  clampToLane: boolean;
  onOpen: (workItemId: number) => void;
  onRemove: (itemId: string) => void;
  onSchedule: (itemId: string, startsOn: string, endsOn: string) => void;
  onPreview: (itemId: string, range: ItemRange | null) => void;
  onMoveStart: (event: React.PointerEvent<HTMLDivElement>) => void;
}): React.JSX.Element {
  const dragged = useRef(false);
  const title = item.title === String(item.workItemId) ? "" : item.title;
  const range = itemRange(item, lane);
  const when = `${formatDate(range.startsOn)} – ${formatDate(range.endsOn)}`;
  const [datesOpen, setDatesOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(range.startsOn);
  const [draftEnd, setDraftEnd] = useState(range.endsOn);

  function resize(edge: "start" | "end", event: React.PointerEvent<HTMLButtonElement>): void {
    event.preventDefault();
    event.stopPropagation();
    const chart = event.currentTarget.closest("[data-roadmap-chart]");
    if (!(chart instanceof HTMLElement) || pending) {
      return;
    }
    dragged.current = true;
    const originX = event.clientX;
    const chartWidth = chart.getBoundingClientRect().width;
    const initial = itemRange(item, lane);
    const boundStart = clampToLane ? lane.startsOn : axisStart;
    const boundEnd = clampToLane ? lane.endsOn : addDays(axisEnd, -1);
    const apply = (clientX: number): ItemRange =>
      resizeEdge(
        initial.startsOn,
        initial.endsOn,
        edge,
        daysFromPixels(clientX - originX, chartWidth, axisStart, axisEnd),
        boundStart,
        boundEnd,
      );
    const move = (pointerEvent: PointerEvent): void => {
      onPreview(item.id, apply(pointerEvent.clientX));
    };
    const finish = (pointerEvent: PointerEvent): void => {
      const next = apply(pointerEvent.clientX);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      if (next.startsOn !== initial.startsOn || next.endsOn !== initial.endsOn) {
        onPreview(item.id, next);
        onSchedule(item.id, next.startsOn, next.endsOn);
      } else {
        onPreview(item.id, null);
      }
      window.setTimeout(() => {
        dragged.current = false;
      }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  }

  function saveDate(nextStart: string, nextEnd: string): void {
    if (!clampToLane) {
      const end = nextEnd < nextStart ? nextStart : nextEnd;
      if (nextStart === range.startsOn && end === range.endsOn && item.startsOn) {
        return;
      }
      onSchedule(item.id, nextStart, end);
      return;
    }
    const start = nextStart > lane.endsOn ? lane.endsOn : nextStart;
    const end = nextEnd < start ? start : nextEnd;
    const fitted = fitRange(start, end, lane.startsOn, lane.endsOn);
    if (fitted.startsOn === range.startsOn && fitted.endsOn === range.endsOn && item.startsOn) {
      return;
    }
    onSchedule(item.id, fitted.startsOn, fitted.endsOn);
  }

  return (
    <div
      className={`${lifted ? "fixed z-30" : "absolute top-1.5 z-10"} flex h-8 min-w-6 items-stretch overflow-hidden rounded-full text-white shadow-sm`}
      style={
        lifted
          ? {
              left: lifted.left,
              top: lifted.top,
              width: lifted.width,
              background: color,
              pointerEvents: "none",
              transition: "none",
            }
          : { left: `${left}%`, width: `${width}%`, background: color, transition: "none" }
      }
      title={`${item.type ? `${item.type}. ` : ""}${when}. Drag the bar to move it, or either end to resize.`}
    >
      <button
        aria-label={`Change start date of ${item.workItemId}`}
        className="w-2 shrink-0 cursor-ew-resize bg-black/15"
        disabled={pending}
        type="button"
        onPointerDown={(event) => {
          resize("start", event);
        }}
      />
      <div
        aria-label={`Work item ${item.workItemId}${title ? `, ${title}` : ""}. Rank ${item.rank}.`}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 px-1 active:cursor-grabbing"
        role="button"
        tabIndex={0}
        onClick={(event) => {
          if (dragged.current || !event.currentTarget.contains(event.target as Node)) {
            return;
          }
          onOpen(item.workItemId);
        }}
        onPointerDown={(event) => {
          if (pending || (event.target as HTMLElement).closest("button")) {
            return;
          }
          const originX = event.clientX;
          const originY = event.clientY;
          const watch = (pointerEvent: PointerEvent): void => {
            if (Math.hypot(pointerEvent.clientX - originX, pointerEvent.clientY - originY) >= 4) {
              dragged.current = true;
            }
          };
          const end = (): void => {
            window.removeEventListener("pointermove", watch);
            window.removeEventListener("pointerup", end);
            window.setTimeout(() => {
              dragged.current = false;
            }, 0);
          };
          window.addEventListener("pointermove", watch);
          window.addEventListener("pointerup", end);
          onMoveStart(event);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(item.workItemId);
          }
        }}
      >
        <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-900">
          {item.workItemId}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{title || `Rank ${item.rank}`}</span>
        <Button
          aria-label={`Set dates for ${item.workItemId}`}
          className="!text-white"
          disabled={pending}
          icon={<CalendarOutlined />}
          size="small"
          type="text"
          onClick={(event) => {
            event.stopPropagation();
            setDraftStart(range.startsOn);
            setDraftEnd(range.endsOn);
            setDatesOpen(true);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        />
        <Modal
          destroyOnHidden
          okText="Save"
          open={datesOpen}
          title={`Dates for ${item.workItemId}`}
          onCancel={() => {
            setDatesOpen(false);
          }}
          onOk={() => {
            saveDate(draftStart, draftEnd);
            setDatesOpen(false);
          }}
        >
          <div className="flex flex-col gap-3 py-2">
            <label className="flex flex-col gap-1 text-sm">
              Start
              <DatePicker
                className="w-full"
                disabledDate={
                  clampToLane
                    ? (date) => {
                        const iso = date.format("YYYY-MM-DD");
                        return iso < lane.startsOn || iso > lane.endsOn;
                      }
                    : undefined
                }
                format={DEFAULT_DATE_FORMAT}
                value={dayjs(draftStart)}
                onChange={(value) => {
                  if (!value) {
                    return;
                  }
                  const next = value.format("YYYY-MM-DD");
                  setDraftStart(next);
                  if (next > draftEnd) {
                    setDraftEnd(next);
                  }
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              End
              <DatePicker
                className="w-full"
                disabledDate={
                  clampToLane
                    ? (date) => {
                        const iso = date.format("YYYY-MM-DD");
                        return iso < lane.startsOn || iso > lane.endsOn;
                      }
                    : undefined
                }
                format={DEFAULT_DATE_FORMAT}
                value={dayjs(draftEnd)}
                onChange={(value) => {
                  if (!value) {
                    return;
                  }
                  const next = value.format("YYYY-MM-DD");
                  setDraftEnd(next < draftStart ? draftStart : next);
                }}
              />
            </label>
          </div>
        </Modal>
        <Popconfirm
          cancelText="Cancel"
          description="This removes it from the roadmap."
          okText="Remove"
          title="Remove this work item?"
          onConfirm={() => {
            onRemove(item.id);
          }}
        >
          <Button
            aria-label={`Remove ${item.workItemId}`}
            className="!text-white"
            danger
            disabled={pending}
            icon={<DeleteOutlined />}
            size="small"
            type="text"
            onClick={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          />
        </Popconfirm>
      </div>
      <button
        aria-label={`Change end date of ${item.workItemId}`}
        className="w-2 shrink-0 cursor-ew-resize bg-black/15"
        disabled={pending}
        type="button"
        onPointerDown={(event) => {
          resize("end", event);
        }}
      />
    </div>
  );
};

function SprintLane({
  sprint,
  showTeam,
  axisStart,
  axisEnd,
  months,
  pending,
  preview,
  lift,
  onOpenItem,
  onRemoveItem,
  onScheduleItem,
  onPreview,
  onMoveStart,
}: {
  sprint: RoadmapSprintLane;
  showTeam: boolean;
  axisStart: string;
  axisEnd: string;
  months: readonly TimelineMonth[];
  pending: boolean;
  preview: (ItemRange & { id: string }) | null;
  lift: Lift | null;
  onOpenItem: (workItemId: number) => void;
  onRemoveItem: (itemId: string) => void;
  onScheduleItem: (itemId: string, startsOn: string, endsOn: string) => void;
  onPreview: (itemId: string, range: ItemRange | null) => void;
  onMoveStart: (item: RoadmapItem, index: number, event: React.PointerEvent<HTMLDivElement>) => void;
}): React.JSX.Element {
  const lane: RoadmapWindow = {
    id: sprint.id,
    name: sprint.name,
    startsOn: sprint.startsOn,
    endsOn: sprint.endsOn,
    color: sprint.color,
    items: sprint.items,
  };
  const rows = sprint.items.length > 0 ? sprint.items : [null];
  return (
    <section className="border-b border-slate-200 dark:border-slate-700">
      <div className="flex">
        <div
          className="flex shrink-0 flex-col justify-center px-3 py-3 text-white"
          style={{ width: LABEL_WIDTH, background: sprint.color }}
        >
          <div className="text-sm font-semibold leading-tight">{sprint.name}</div>
          <div className="mt-1 text-[11px] leading-4 text-white/85">
            <div>{formatDate(sprint.startsOn)}</div>
            <div>{formatDate(sprint.endsOn)}</div>
            {showTeam ? <div>{sprint.team}</div> : null}
          </div>
        </div>
        <div
          className="relative min-w-0 flex-1"
          data-roadmap-chart=""
          data-roadmap-count={sprint.items.length}
          data-roadmap-window={sprint.id}
        >
          <MonthGrid months={months} />
          <div className="relative">
            {rows.map((item, index) => {
              const shown = item ? (preview?.id === item.id ? preview : itemRange(item, lane)) : null;
              const span = shown ? barPercent(shown.startsOn, shown.endsOn, axisStart, axisEnd) : null;
              return (
                <div
                  key={item?.id ?? `${sprint.id}-empty`}
                  className="relative h-12"
                  data-roadmap-index={index}
                  data-roadmap-row=""
                  data-roadmap-window={sprint.id}
                >
                  <DayDots months={months} />
                  {item && span ? (
                    <WorkItemBar
                      axisEnd={axisEnd}
                      axisStart={axisStart}
                      clampToLane={false}
                      color={workItemTypeBarColor(item.type)}
                      item={item}
                      lane={lane}
                      left={span.left}
                      lifted={lift?.itemId === item.id ? lift : null}
                      pending={pending}
                      width={span.width}
                      onMoveStart={(event) => {
                        onMoveStart(item, index, event);
                      }}
                      onOpen={onOpenItem}
                      onPreview={onPreview}
                      onRemove={onRemoveItem}
                      onSchedule={onScheduleItem}
                    />
                  ) : (
                    <div className="px-3 py-3 text-sm text-slate-400">
                      No parent work items in this sprint.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function RoadmapDiagram({
  windows,
  sprints,
  pending,
  onEditWindow,
  onUpdateWindow,
  onDeleteWindow,
  onAddItem,
  onOpenItem,
  onRemoveItem,
  onPlaceItem,
  onScheduleItem,
}: {
  windows: RoadmapWindow[];
  sprints: RoadmapSprintLane[];
  pending: boolean;
  onEditWindow: (windowId: string) => void;
  onUpdateWindow: (windowId: string, input: RoadmapWindowInput) => void;
  onDeleteWindow: (windowId: string) => void;
  onAddItem: (windowId: string, rawId: string) => void;
  onOpenItem: (workItemId: number) => void;
  onRemoveItem: (itemId: string) => void;
  onPlaceItem: (
    itemId: string,
    windowId: string,
    targetIndex: number,
    range?: ItemRange,
  ) => void;
  onScheduleItem: (itemId: string, startsOn: string, endsOn: string) => void;
}): React.JSX.Element {
  const { modal } = App.useApp();
  const [addingWindowId, setAddingWindowId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<
    | { windowId: string; field: "name"; name: string }
    | { windowId: string; field: "dates"; startsOn: string; endsOn: string }
    | null
  >(null);
  const nameClosed = useRef(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<(ItemRange & { id: string }) | null>(null);
  const [lift, setLift] = useState<Lift | null>(null);
  const axis = timelineMonths([...windows, ...sprints]);
  const showTeam = new Set(sprints.map((sprint) => sprint.team)).size > 1;
  const sprintIds = new Set(sprints.map((sprint) => sprint.id));
  const dropTargets: RoadmapWindow[] = [
    ...sprints.map((sprint) => ({
      id: sprint.id,
      name: sprint.name,
      startsOn: sprint.startsOn,
      endsOn: sprint.endsOn,
      color: sprint.color,
      items: sprint.items,
    })),
    ...windows,
  ];

  function commitWorkItem(windowId: string): void {
    const rawId = (drafts[windowId] ?? "").trim();
    if (rawId.length === 0) {
      return;
    }
    onAddItem(windowId, rawId);
    setDrafts((current) => ({ ...current, [windowId]: "" }));
    setAddingWindowId(null);
  }

  useEffect(() => {
    if (!addingWindowId) {
      return;
    }
    function closeOnOutsideClick(event: MouseEvent): void {
      const target = event.target;
      const element = target instanceof Element ? target : null;
      if (element?.closest(".ant-popover")) {
        return;
      }
      setAddingWindowId(null);
    }
    document.addEventListener("mousedown", closeOnOutsideClick, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick, true);
    };
  }, [addingWindowId]);

  useEffect(() => {
    if (inlineEdit?.field !== "dates") {
      return;
    }
    function closeOnOutsideClick(event: MouseEvent): void {
      const target = event.target;
      const element = target instanceof Element ? target : null;
      if (element?.closest("[data-roadmap-inline], .ant-picker-dropdown")) {
        return;
      }
      setInlineEdit(null);
    }
    document.addEventListener("mousedown", closeOnOutsideClick, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick, true);
    };
  }, [inlineEdit]);

  function commitInlineName(): void {
    if (nameClosed.current || !inlineEdit || inlineEdit.field !== "name") {
      return;
    }
    nameClosed.current = true;
    const lane = windows.find((candidate) => candidate.id === inlineEdit.windowId);
    const name = inlineEdit.name.trim();
    setInlineEdit(null);
    if (!lane || name.length === 0 || name === lane.name) {
      return;
    }
    onUpdateWindow(lane.id, { name, startsOn: lane.startsOn, endsOn: lane.endsOn });
  }

  function commitInlineDates(
    lane: RoadmapWindow,
    startsOn: string,
    endsOn: string,
    changed: "start" | "end",
  ): void {
    let nextStart = startsOn;
    let nextEnd = endsOn;
    if (nextEnd < nextStart) {
      if (changed === "start") {
        nextEnd = nextStart;
      } else {
        nextStart = nextEnd;
      }
    }
    setInlineEdit({ windowId: lane.id, field: "dates", startsOn: nextStart, endsOn: nextEnd });
    if (nextStart === lane.startsOn && nextEnd === lane.endsOn) {
      return;
    }
    onUpdateWindow(lane.id, { name: lane.name, startsOn: nextStart, endsOn: nextEnd });
  }

  if (preview) {
    const lane = dropTargets.find((candidate) => candidate.items.some((item) => item.id === preview.id));
    const item = lane?.items.find((candidate) => candidate.id === preview.id);
    if (lane && item) {
      const range = itemRange(item, lane);
      if (range.startsOn === preview.startsOn && range.endsOn === preview.endsOn) {
        setPreview(null);
      }
    }
  }

  function beginMove(
    item: RoadmapItem,
    lane: RoadmapWindow,
    index: number,
    event: React.PointerEvent<HTMLDivElement>,
  ): void {
    if (!axis || pending) {
      return;
    }
    const pill = event.currentTarget.parentElement;
    if (!(pill instanceof HTMLElement)) {
      return;
    }
    const originX = event.clientX;
    const originY = event.clientY;
    const originRect = pill.getBoundingClientRect();
    const pointerOffset = event.clientX - originRect.left;
    const origin = itemRange(item, lane);
    let dragging = false;

    const locate = (
      clientX: number,
      clientY: number,
    ): { windowId: string; index: number; chart: HTMLElement; range: ItemRange } | null => {
      const hit = document.elementFromPoint(clientX, clientY);
      const row = hit?.closest<HTMLElement>("[data-roadmap-row]");
      const chart =
        row?.closest<HTMLElement>("[data-roadmap-chart]") ??
        hit?.closest<HTMLElement>("[data-roadmap-chart]");
      const windowId = row?.dataset.roadmapWindow ?? chart?.dataset.roadmapWindow;
      const target = dropTargets.find((candidate) => candidate.id === windowId);
      if (!chart || !windowId || !target) {
        return null;
      }
      const targetIndex = row
        ? Number(row.dataset.roadmapIndex)
        : Number(chart.dataset.roadmapCount ?? "0");
      const sprintTarget = sprintIds.has(target.id);
      return {
        windowId,
        index: targetIndex,
        chart,
        range: rangeFromClient(
          clientX,
          pointerOffset,
          origin,
          chart,
          axis.start,
          axis.end,
          sprintTarget ? axis.start : target.startsOn,
          sprintTarget ? addDays(axis.end, -1) : target.endsOn,
        ),
      };
    };

    const move = (pointerEvent: PointerEvent): void => {
      if (!dragging) {
        if (Math.hypot(pointerEvent.clientX - originX, pointerEvent.clientY - originY) < 4) {
          return;
        }
        dragging = true;
      }
      pill.style.pointerEvents = "none";
      const located = locate(pointerEvent.clientX, pointerEvent.clientY);
      if (!located) {
        return;
      }
      const row = document
        .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
        ?.closest<HTMLElement>("[data-roadmap-row]");
      const rowRect = row?.getBoundingClientRect() ?? located.chart.getBoundingClientRect();
      const chartRect = located.chart.getBoundingClientRect();
      const span = barPercent(located.range.startsOn, located.range.endsOn, axis.start, axis.end);
      setLift({
        itemId: item.id,
        left: chartRect.left + (span.left / 100) * chartRect.width,
        top: rowRect.top + 6,
        width: Math.max(24, (span.width / 100) * chartRect.width),
      });
    };

    const finish = (pointerEvent: PointerEvent): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      if (!dragging) {
        pill.style.pointerEvents = "";
        return;
      }
      const located = locate(pointerEvent.clientX, pointerEvent.clientY);
      pill.style.pointerEvents = "";
      if (!located || Number.isNaN(located.index)) {
        setLift(null);
        return;
      }
      const datesChanged =
        located.range.startsOn !== origin.startsOn || located.range.endsOn !== origin.endsOn;
      const sourceSprint = sprintIds.has(lane.id);
      const targetSprint = sprintIds.has(located.windowId);
      if (sourceSprint !== targetSprint || (sourceSprint && located.windowId !== lane.id)) {
        setLift(null);
        return;
      }
      const sameSlot = located.windowId === lane.id && located.index === index;
      setLift(null);
      if (sameSlot) {
        if (datesChanged) {
          onScheduleItem(item.id, located.range.startsOn, located.range.endsOn);
        }
        return;
      }
      onPlaceItem(
        item.id,
        located.windowId,
        located.index,
        datesChanged ? located.range : undefined,
      );
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  }

  if (!axis) {
    return (
      <Empty
        description="Add a time frame to start the roadmap."
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
      <div
      style={{
        width: `calc(${LABEL_WIDTH} + ${axis.months.reduce((total, month) => total + month.days, 0) * DAY_WIDTH}px)`,
      }}
    >
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <div className="shrink-0" style={{ width: LABEL_WIDTH }} />
          <div className="flex min-w-0 flex-1">
            {axis.months.map((month) => (
              <MonthHeading key={month.key} month={month} />
            ))}
          </div>
        </div>
        {sprints.map((sprint) => (
          <SprintLane
            key={`${sprint.team}:${sprint.id}`}
            axisEnd={axis.end}
            axisStart={axis.start}
            lift={lift}
            months={axis.months}
            pending={pending}
            preview={preview}
            showTeam={showTeam}
            sprint={sprint}
            onMoveStart={(item, index, event) => {
              beginMove(
                item,
                {
                  id: sprint.id,
                  name: sprint.name,
                  startsOn: sprint.startsOn,
                  endsOn: sprint.endsOn,
                  color: sprint.color,
                  items: sprint.items,
                },
                index,
                event,
              );
            }}
            onOpenItem={onOpenItem}
            onPreview={(itemId, range) => {
              setPreview(range ? { id: itemId, ...range } : null);
            }}
            onRemoveItem={onRemoveItem}
            onScheduleItem={onScheduleItem}
          />
        ))}
        {windows.map((window) => {
          const color = window.color ?? "#7c3aed";
          const rows = window.items.length > 0 ? window.items : [null];
          return (
            <section
              key={window.id}
              className="border-b border-slate-200 last:border-b-0 dark:border-slate-700"
            >
              <div className="flex">
              <div
                className="flex shrink-0 flex-col justify-center px-3 py-3 text-white"
                style={{ width: LABEL_WIDTH, background: color }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1 text-sm font-semibold leading-tight">
                    {inlineEdit?.windowId === window.id && inlineEdit.field === "name" ? (
                      <Input
                        autoFocus
                        className="!text-slate-900"
                        disabled={pending}
                        size="small"
                        value={inlineEdit.name}
                        onBlur={() => {
                          commitInlineName();
                        }}
                        onChange={(event) => {
                          const name = event.target.value;
                          setInlineEdit({ windowId: window.id, field: "name", name });
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            nameClosed.current = true;
                            setInlineEdit(null);
                          }
                        }}
                        onPressEnter={() => {
                          commitInlineName();
                        }}
                      />
                    ) : (
                      <span
                        className="cursor-text"
                        onDoubleClick={() => {
                          if (pending) {
                            return;
                          }
                          nameClosed.current = false;
                          setAddingWindowId(null);
                          setInlineEdit({ windowId: window.id, field: "name", name: window.name });
                        }}
                      >
                        {window.name}
                      </span>
                    )}
                  </div>
                  <Popover
                    content={
                      <div className="flex w-56 gap-2">
                        <Input
                          autoFocus
                          disabled={pending}
                          placeholder="Work item id"
                          size="small"
                          value={drafts[window.id] ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDrafts((current) => ({ ...current, [window.id]: value }));
                          }}
                          onPressEnter={() => {
                            commitWorkItem(window.id);
                          }}
                        />
                        <Button
                          disabled={pending}
                          size="small"
                          type="primary"
                          onClick={() => {
                            commitWorkItem(window.id);
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    }
                    destroyOnHidden
                    open={addingWindowId === window.id}
                    placement="right"
                    trigger={[]}
                    onOpenChange={(open) => {
                      if (!open) {
                        setAddingWindowId(null);
                      }
                    }}
                  >
                    <Dropdown
                      disabled={pending}
                      menu={{
                        items: [
                          { key: "add", icon: <PlusOutlined />, label: "Add" },
                          { key: "edit", icon: <EditOutlined />, label: "Edit" },
                          {
                            key: "delete",
                            danger: true,
                            icon: <DeleteOutlined />,
                            label: "Delete",
                          },
                        ],
                        onClick: ({ key }) => {
                          const windowId = window.id;
                          if (key === "add") {
                            setTimeout(() => {
                              setAddingWindowId(windowId);
                            }, 0);
                            return;
                          }
                          setAddingWindowId(null);
                          if (key === "edit") {
                            onEditWindow(windowId);
                            return;
                          }
                          modal.confirm({
                            cancelText: "Cancel",
                            content: "Work items in this time frame are removed with it.",
                            okButtonProps: { danger: true },
                            okText: "Delete",
                            title: "Delete this time frame?",
                            onOk: () => {
                              onDeleteWindow(windowId);
                            },
                          });
                        },
                      }}
                      trigger={["click"]}
                      onOpenChange={(open) => {
                        if (open) {
                          setAddingWindowId(null);
                        }
                      }}
                    >
                      <Button
                        aria-label={`Actions for ${window.name}`}
                        className="!text-white"
                        disabled={pending}
                        icon={<EllipsisOutlined />}
                        size="small"
                        type="text"
                      />
                    </Dropdown>
                  </Popover>
                </div>
                <div className="mt-1 text-[11px] leading-4 text-white/85">
                  {inlineEdit?.windowId === window.id && inlineEdit.field === "dates" ? (
                    <div className="flex flex-col gap-1" data-roadmap-inline="">
                      <DatePicker
                        allowClear={false}
                        autoFocus
                        className="w-full"
                        disabled={pending}
                        format={DEFAULT_DATE_FORMAT}
                        size="small"
                        value={dayjs(inlineEdit.startsOn)}
                        onChange={(value) => {
                          if (!value || inlineEdit.field !== "dates") {
                            return;
                          }
                          commitInlineDates(window, value.format("YYYY-MM-DD"), inlineEdit.endsOn, "start");
                        }}
                      />
                      <DatePicker
                        allowClear={false}
                        className="w-full"
                        disabled={pending}
                        format={DEFAULT_DATE_FORMAT}
                        size="small"
                        value={dayjs(inlineEdit.endsOn)}
                        onChange={(value) => {
                          if (!value || inlineEdit.field !== "dates") {
                            return;
                          }
                          commitInlineDates(window, inlineEdit.startsOn, value.format("YYYY-MM-DD"), "end");
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="cursor-text"
                      onDoubleClick={() => {
                        if (pending) {
                          return;
                        }
                        setAddingWindowId(null);
                        setInlineEdit({
                          windowId: window.id,
                          field: "dates",
                          startsOn: window.startsOn,
                          endsOn: window.endsOn,
                        });
                      }}
                    >
                      <div>{formatDate(window.startsOn)}</div>
                      <div>{formatDate(window.endsOn)}</div>
                    </div>
                  )}
                </div>
              </div>
              <div
                className="relative min-w-0 flex-1"
                data-roadmap-chart=""
                data-roadmap-count={window.items.length}
                data-roadmap-window={window.id}
              >
                <MonthGrid months={axis.months} />
                <div className="relative">
                  {rows.map((item, index) => {
                    const shown = item
                      ? preview?.id === item.id
                        ? preview
                        : itemRange(item, window)
                      : null;
                    const span = shown
                      ? barPercent(shown.startsOn, shown.endsOn, axis.start, axis.end)
                      : null;
                    return (
                    <div
                      key={item?.id ?? `${window.id}-empty`}
                      className="relative h-12"
                      data-roadmap-index={index}
                      data-roadmap-row=""
                      data-roadmap-window={window.id}
                    >
                      <DayDots months={axis.months} />
                      {item && span ? (
                        <WorkItemBar
                          axisEnd={axis.end}
                          axisStart={axis.start}
                          clampToLane
                          color={workItemTypeBarColor(item.type)}
                          item={item}
                          lane={window}
                          left={span.left}
                          lifted={lift?.itemId === item.id ? lift : null}
                          pending={pending}
                          width={span.width}
                          onMoveStart={(event) => {
                            beginMove(item, window, index, event);
                          }}
                          onOpen={onOpenItem}
                          onPreview={(itemId, range) => {
                            setPreview(range ? { id: itemId, ...range } : null);
                          }}
                          onRemove={onRemoveItem}
                          onSchedule={onScheduleItem}
                        />
                      ) : (
                        <div className="px-3 py-3 text-sm text-slate-400">
                          Add a work item id. Rank 1 is implemented first.
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
