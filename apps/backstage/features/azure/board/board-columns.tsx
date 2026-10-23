"use client";

import { Card, Tag } from "antd";
import type { BoardCard, BoardColumnView, BoardRelation } from "@/features/azure/board/group-board";
import { workItemTypeBorderColor } from "@/features/azure/board/work-item-appearance";
import { WorkItemStateTag, WorkItemTypeTag } from "@/features/azure/board/work-item-tags";
import { HighlightMatch } from "@/shared/ui";

type Swimlane = {
  key: string;
  parentCard: BoardCard | null;
  parent: BoardRelation | null;
  tasksByColumn: Map<string, BoardCard[]>;
};

function buildSwimlanes(columns: readonly BoardColumnView[]): Swimlane[] {
  const lanes = new Map<string, Swimlane>();
  const parentIds = new Set<number>();

  function laneFor(key: string): Swimlane {
    const existing = lanes.get(key);
    if (existing) {
      return existing;
    }
    const created: Swimlane = {
      key,
      parentCard: null,
      parent: null,
      tasksByColumn: new Map(),
    };
    lanes.set(key, created);
    return created;
  }

  const cards = columns.flatMap((column) => column.cards);
  const cardsById = new Map(cards.map((card) => [card.item.id, card]));

  for (const card of cards) {
    if (card.parent == null) {
      continue;
    }
    parentIds.add(card.parent.id);
    const lane = laneFor(String(card.parent.id));
    lane.parent = card.parent;
    lane.parentCard = cardsById.get(card.parent.id) ?? lane.parentCard;
    const tasks = lane.tasksByColumn.get(card.columnId) ?? [];
    tasks.push(card);
    lane.tasksByColumn.set(card.columnId, tasks);
  }

  for (const card of cards) {
    if (card.item.type !== "Product Backlog Item" || card.parent != null) {
      continue;
    }
    parentIds.add(card.item.id);
    const lane = laneFor(String(card.item.id));
    lane.parentCard = card;
    lane.parent ??= {
      id: card.item.id,
      title: card.item.title,
      url: card.item.url,
      type: card.item.type,
      state: card.item.state,
      assignedTo: card.item.assignedTo,
    };
  }

  const unparented = laneFor("none");
  for (const card of cards) {
    if (card.parent != null || parentIds.has(card.item.id)) {
      continue;
    }
    const tasks = unparented.tasksByColumn.get(card.columnId) ?? [];
    tasks.push(card);
    unparented.tasksByColumn.set(card.columnId, tasks);
  }

  return [...lanes.values()]
    .filter((lane) => lane.key !== "none" || lane.tasksByColumn.size > 0)
    .sort((left, right) => {
      if (left.key === "none") {
        return 1;
      }
      if (right.key === "none") {
        return -1;
      }
      return Number(left.key) - Number(right.key);
    });
}

function cardBorderStyle(type: string | null | undefined): React.CSSProperties {
  const accent = type == null ? "#8c8c8c" : workItemTypeBorderColor(type);
  return {
    background: "#fff",
    borderTop: "1px solid #d9d9d9",
    borderRight: "1px solid #d9d9d9",
    borderBottom: "1px solid #d9d9d9",
    borderLeft: `4px solid ${accent}`,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
  };
}

function taskCount(lane: Swimlane): number {
  let count = 0;
  for (const tasks of lane.tasksByColumn.values()) {
    count += tasks.length;
  }
  return count;
}

function ParentRowCard({
  lane,
  query,
}: {
  lane: Swimlane;
  query?: string;
}): React.JSX.Element {
  if (lane.key === "none") {
    return (
      <Card size="small" style={cardBorderStyle(null)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">No parent</span>
          <Tag>{taskCount(lane)}</Tag>
        </div>
      </Card>
    );
  }

  const item = lane.parentCard?.item;
  const id = item?.id ?? lane.parent?.id;
  const url = item?.url ?? lane.parent?.url;
  const title = item?.title ?? lane.parent?.title;
  const type = item?.type ?? lane.parent?.type;

  return (
    <Card size="small" style={cardBorderStyle(type)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            {url != null && id != null ? (
              <a href={url} rel="noopener noreferrer" target="_blank">
                <HighlightMatch query={query} text={String(id)} />
              </a>
            ) : null}
            {type ? <WorkItemTypeTag type={type} /> : null}
          </div>
          {title ? (
            <div className="mb-1">
              <HighlightMatch query={query} text={title} />
            </div>
          ) : (
            <div className="mb-1 text-sm text-slate-500">Not in this sprint</div>
          )}
          {item?.state ?? lane.parent?.state ? (
            <WorkItemStateTag state={item?.state ?? lane.parent?.state ?? ""} />
          ) : null}
          {item != null || lane.parent?.title != null ? (
            <div className="mt-1 text-sm text-slate-500">
              <HighlightMatch
                query={query}
                text={item?.assignedTo ?? lane.parent?.assignedTo ?? "Unassigned"}
              />
            </div>
          ) : null}
        </div>
        <Tag>{taskCount(lane)}</Tag>
      </div>
    </Card>
  );
}

function TaskCard({ card, query }: { card: BoardCard; query?: string }): React.JSX.Element {
  return (
    <Card size="small" style={cardBorderStyle(card.item.type)}>
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <a href={card.item.url} rel="noopener noreferrer" target="_blank">
          <HighlightMatch query={query} text={String(card.item.id)} />
        </a>
        <WorkItemTypeTag type={card.item.type} />
      </div>
      <HighlightMatch query={query} text={card.item.title} />
      <div className="mt-1 text-sm text-slate-500">
        <HighlightMatch query={query} text={card.item.assignedTo ?? "Unassigned"} />
      </div>
    </Card>
  );
}

export function BoardColumns({
  columns,
  query,
}: {
  columns: BoardColumnView[];
  query?: string;
}): React.JSX.Element {
  if (columns.length === 0) {
    return <p className="text-slate-500">This team has no taskboard columns.</p>;
  }

  const lanes = buildSwimlanes(columns);
  const countByColumn = new Map<string, number>();
  for (const lane of lanes) {
    for (const [columnId, tasks] of lane.tasksByColumn) {
      countByColumn.set(columnId, (countByColumn.get(columnId) ?? 0) + tasks.length);
    }
  }

  return (
    <div className="min-w-max pb-2">
      <div className="sticky top-0 z-20 flex items-center border-b border-slate-300 bg-white py-2 shadow-sm">
        <div className="sticky left-0 z-30 w-72 shrink-0 border-r border-slate-200 bg-white px-2 font-medium">
          Parent
        </div>
        {columns.map((column) => (
          <div
            className="flex w-60 shrink-0 items-center gap-2 border-r border-slate-200 bg-white px-2 font-medium"
            key={column.id}
          >
            <span>{column.name}</span>
            <Tag>{countByColumn.get(column.id) ?? 0}</Tag>
          </div>
        ))}
      </div>
      {lanes.map((lane) => (
        <div className="flex items-stretch border-b border-slate-300 bg-slate-50 py-3" key={lane.key}>
          <div className="sticky left-0 z-10 w-72 shrink-0 self-stretch border-r border-slate-200 bg-slate-50 px-2">
            <ParentRowCard lane={lane} query={query} />
          </div>
          {columns.map((column) => (
            <div className="flex w-60 shrink-0 flex-col gap-3 border-r border-slate-200 px-2" key={column.id}>
              {(lane.tasksByColumn.get(column.id) ?? []).map((card) => (
                <TaskCard card={card} key={card.item.id} query={query} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
