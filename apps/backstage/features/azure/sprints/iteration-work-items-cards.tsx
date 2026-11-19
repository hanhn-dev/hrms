"use client";

import { useState } from "react";
import { Tag } from "antd";
import { DownOutlined, RightOutlined, WarningOutlined } from "@ant-design/icons";
import type { WorkItemSummary } from "@hrms/azure-devops";
import { workItemTypeBorderColor } from "@/features/azure/board/work-item-appearance";
import { WorkItemStateTag, WorkItemTypeTag } from "@/features/azure/board/work-item-tags";
import { summarizeSprintTrees } from "@/features/azure/sprints/sprint-summary";
import {
  buildSprintWorkItemTrees,
  type SprintWorkItemTree,
} from "@/features/azure/sprints/sprint-work-item-tree";
import { useWorkItemView } from "@/features/azure/work-item";
import { formatDate } from "@/shared/format-date";
import { Text } from "@/shared/ui";

function cardStyle(type: string, missingEffort: boolean): React.CSSProperties {
  return {
    // Match MissingEffortPanel (`bg-amber-50` / `border-amber-300`).
    background: missingEffort ? "#fffbeb" : "#fff",
    borderTop: `1px solid ${missingEffort ? "#fcd34d" : "#d9d9d9"}`,
    borderRight: `1px solid ${missingEffort ? "#fcd34d" : "#d9d9d9"}`,
    borderBottom: `1px solid ${missingEffort ? "#fcd34d" : "#d9d9d9"}`,
    borderLeft: `4px solid ${workItemTypeBorderColor(type)}`,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
  };
}

function formatEffort(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function WorkItemIdButton({
  id,
  onOpenWorkItem,
}: {
  id: number;
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  return (
    <button
      className="cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-blue-600 hover:underline"
      type="button"
      onClick={() => {
        onOpenWorkItem(id);
      }}
    >
      #{id}
    </button>
  );
}

function ChildItemCard({
  item,
  onOpenWorkItem,
}: {
  item: WorkItemSummary;
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  return (
    <li
      className="rounded border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
      style={{ borderLeft: `3px solid ${workItemTypeBorderColor(item.type)}` }}
    >
      <div className="flex flex-wrap items-center gap-1">
        <WorkItemIdButton id={item.id} onOpenWorkItem={onOpenWorkItem} />
        <WorkItemTypeTag type={item.type} />
        <WorkItemStateTag state={item.state} />
      </div>
      <button
        className="mt-0.5 cursor-pointer border-0 bg-transparent p-0 text-left text-xs leading-snug text-slate-700 hover:underline dark:text-slate-200"
        type="button"
        onClick={() => {
          onOpenWorkItem(item.id);
        }}
      >
        <span className="line-clamp-2">{item.title}</span>
      </button>
      <div className="mt-1 text-[11px] text-slate-500">
        {item.assignedTo ?? "Unassigned"}
        {item.changedDate ? ` · Changed ${formatDate(item.changedDate)}` : null}
      </div>
    </li>
  );
}

function SprintTreeCard({
  tree,
  missingEffort,
  onOpenWorkItem,
}: {
  tree: SprintWorkItemTree;
  missingEffort: boolean;
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  const { item, children, parent } = tree;

  return (
    <article
      className="rounded-md px-3 py-2 text-slate-800 dark:text-slate-100"
      style={cardStyle(item.type, missingEffort)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <WorkItemIdButton id={item.id} onOpenWorkItem={onOpenWorkItem} />
        <WorkItemTypeTag type={item.type} />
        <WorkItemStateTag state={item.state} />
        {item.effort != null && item.effort > 0 ? (
          <Tag color="blue">Effort {formatEffort(item.effort)}</Tag>
        ) : null}
        {item.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <button
        className="mt-1 cursor-pointer border-0 bg-transparent p-0 text-left text-sm leading-snug hover:underline"
        type="button"
        onClick={() => {
          onOpenWorkItem(item.id);
        }}
      >
        <span className="line-clamp-3">{item.title}</span>
      </button>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
        <span>{item.assignedTo ?? "Unassigned"}</span>
        <span>Changed {formatDate(item.changedDate)}</span>
      </div>
      {parent != null ? (
        <div className="mt-1 text-xs text-slate-500">
          Parent{" "}
          <button
            className="cursor-pointer border-0 bg-transparent p-0 text-blue-600 hover:underline"
            type="button"
            onClick={() => {
              onOpenWorkItem(parent.id);
            }}
          >
            #{parent.id}
          </button>{" "}
          {parent.title}
        </div>
      ) : null}
      {children.length > 0 ? (
        <div className="mt-2 border-t border-amber-200/80 pt-2 dark:border-slate-600">
          <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Bugs ({children.length})
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {children.map((child) => (
              <ChildItemCard
                item={child}
                key={child.id}
                onOpenWorkItem={onOpenWorkItem}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function MissingEffortPanel({
  items,
  onOpenWorkItem,
}: {
  items: readonly {
    id: number;
    title: string;
    type: string;
    assignedTo: string | null;
  }[];
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const count = items.length;
  const label = `${count} item${count === 1 ? "" : "s"} missing effort`;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40">
      <button
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left"
        type="button"
        onClick={() => {
          setExpanded((value) => !value);
        }}
      >
        {expanded ? (
          <DownOutlined className="text-amber-600" />
        ) : (
          <RightOutlined className="text-amber-600" />
        )}
        <WarningOutlined className="text-amber-600" />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {label}
        </span>
        <span className="text-xs text-slate-500">
          {expanded ? "Hide details" : "Show details"}
        </span>
      </button>
      {expanded ? (
        <ul className="m-0 list-none space-y-1 border-t border-amber-200 px-3 py-2 dark:border-amber-700">
          {items.map((entry) => (
            <li key={entry.id}>
              <button
                className="cursor-pointer border-0 bg-transparent p-0 text-blue-600 hover:underline"
                type="button"
                onClick={() => {
                  onOpenWorkItem(entry.id);
                }}
              >
                #{entry.id}
              </button>{" "}
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {entry.type} · {entry.title}
                {entry.assignedTo ? ` · ${entry.assignedTo}` : " · Unassigned"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function IterationWorkItemsCards({
  workItems,
}: {
  workItems: WorkItemSummary[];
}): React.JSX.Element {
  const { openView, modal } = useWorkItemView();
  const trees = buildSprintWorkItemTrees(workItems);
  const summary = summarizeSprintTrees(trees);
  const missingIds = new Set(summary.missingEffort.map((entry) => entry.id));

  return (
    <div className="flex flex-col gap-3">
      {trees.length === 0 ? (
        <Text type="secondary">No work items in this sprint.</Text>
      ) : (
        <>
          {summary.missingEffort.length > 0 ? (
            <MissingEffortPanel
              items={summary.missingEffort}
              onOpenWorkItem={openView}
            />
          ) : null}
          {trees.map((tree) => (
            <SprintTreeCard
              key={tree.item.id}
              missingEffort={missingIds.has(tree.item.id)}
              tree={tree}
              onOpenWorkItem={openView}
            />
          ))}
        </>
      )}
      {modal}
    </div>
  );
}
