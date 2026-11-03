"use client";

import { useState } from "react";
import { Button, Card, Progress, Tag } from "antd";
import { DownOutlined, RightOutlined } from "@ant-design/icons";
import type { WorkItemSummary } from "@hrms/azure-devops";
import {
  allPersonItems,
  buildPersonWorkTrees,
  collectStateColumns,
  treesByState,
  type PersonProgress,
  type WorkItemTree,
} from "@/features/azure/progress/aggregate-progress";
import { workItemTypeBorderColor } from "@/features/azure/board/work-item-appearance";
import {
  WorkItemStateTag,
  WorkItemTypeTag,
} from "@/features/azure/board/work-item-tags";
import { useWorkItemView } from "@/features/azure/work-item";

function cardStyle(type: string): React.CSSProperties {
  return {
    background: "#fff",
    borderTop: "1px solid #d9d9d9",
    borderRight: "1px solid #d9d9d9",
    borderBottom: "1px solid #d9d9d9",
    borderLeft: `4px solid ${workItemTypeBorderColor(type)}`,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
  };
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
      className="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-blue-600 hover:underline"
      type="button"
      onClick={() => {
        onOpenWorkItem(id);
      }}
    >
      #{id}
    </button>
  );
}

function ChildTask({
  item,
  onOpenWorkItem,
}: {
  item: WorkItemSummary;
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  return (
    <li className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800">
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
    </li>
  );
}

function WorkTreeCard({
  tree,
  onOpenWorkItem,
}: {
  tree: WorkItemTree;
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  return (
    <div
      className="rounded-md px-2 py-1.5 text-slate-800 dark:text-slate-100"
      style={cardStyle(tree.item.type)}
    >
      <div className="flex flex-wrap items-center gap-1">
        <WorkItemIdButton id={tree.item.id} onOpenWorkItem={onOpenWorkItem} />
        <WorkItemTypeTag type={tree.item.type} />
        <WorkItemStateTag state={tree.item.state} />
      </div>
      <button
        className="mt-1 cursor-pointer border-0 bg-transparent p-0 text-left text-sm leading-snug hover:underline"
        type="button"
        onClick={() => {
          onOpenWorkItem(tree.item.id);
        }}
      >
        <span className="line-clamp-3">{tree.item.title}</span>
      </button>
      {tree.parent != null ? (
        <div className="mt-1 text-xs text-slate-500">
          Parent{" "}
          <button
            className="cursor-pointer border-0 bg-transparent p-0 text-blue-600 hover:underline"
            type="button"
            onClick={() => {
              onOpenWorkItem(tree.parent!.id);
            }}
          >
            #{tree.parent.id}
          </button>{" "}
          <button
            className="cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
            type="button"
            onClick={() => {
              onOpenWorkItem(tree.parent!.id);
            }}
          >
            {tree.parent.title}
          </button>
        </div>
      ) : null}
      {tree.children.length > 0 ? (
        <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-600">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Tasks ({tree.children.length})
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {tree.children.map((child) => (
              <ChildTask item={child} key={child.id} onOpenWorkItem={onOpenWorkItem} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MemberSummaryRow({
  person,
  states,
  expanded,
  onToggle,
}: {
  person: PersonProgress;
  states: readonly string[];
  expanded: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <button
      aria-expanded={expanded}
      className="flex w-full flex-wrap items-center gap-3 border-0 bg-transparent px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
      type="button"
      onClick={onToggle}
    >
      <span className="flex w-5 shrink-0 justify-center text-slate-500">
        {expanded ? <DownOutlined /> : <RightOutlined />}
      </span>
      <span className="min-w-40 flex-1 font-medium text-slate-900 dark:text-slate-100">
        {person.displayName}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <Tag color={person.active > 0 ? "gold" : "default"}>{person.active} active</Tag>
        <Tag color="green">{person.completed} done</Tag>
        {states.map((state) => {
          const count = person.stateCounts[state] ?? 0;
          if (count === 0) {
            return null;
          }
          return (
            <Tag key={state}>
              {state} {count}
            </Tag>
          );
        })}
      </span>
      <span className="ml-auto w-36 shrink-0">
        <Progress percent={person.progressPercent} size="small" />
      </span>
    </button>
  );
}

function MemberDetailBoard({
  person,
  states,
  allWorkItems,
  onOpenWorkItem,
}: {
  person: PersonProgress;
  states: readonly string[];
  allWorkItems: readonly WorkItemSummary[];
  onOpenWorkItem: (id: number) => void;
}): React.JSX.Element {
  const trees = buildPersonWorkTrees(allPersonItems(person), allWorkItems);
  const byState = treesByState(trees);
  const columnMinWidth = 240;

  return (
    <div className="overflow-x-auto border-t border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-950/40">
      <div
        className="min-w-full"
        style={{ minWidth: states.length * columnMinWidth }}
      >
        <div
          className="grid border-b border-slate-200 dark:border-slate-700"
          style={{
            gridTemplateColumns: `repeat(${states.length}, minmax(${columnMinWidth}px, 1fr))`,
          }}
        >
          {states.map((state) => (
            <div
              className="flex items-center justify-center gap-2 border-r border-slate-200 px-3 py-2 text-sm font-medium last:border-r-0 dark:border-slate-700"
              key={state}
            >
              <span>{state}</span>
              <Tag>{byState.get(state)?.length ?? 0}</Tag>
            </div>
          ))}
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${states.length}, minmax(${columnMinWidth}px, 1fr))`,
          }}
        >
          {states.map((state) => {
            const cellTrees = byState.get(state) ?? [];
            return (
              <div
                className="min-h-20 border-r border-slate-100 p-2 last:border-r-0 dark:border-slate-800"
                key={`${person.displayName}-${state}`}
              >
                {cellTrees.length === 0 ? (
                  <div className="h-full min-h-12" />
                ) : (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {cellTrees.map((tree) => (
                      <li key={tree.item.id}>
                        <WorkTreeCard tree={tree} onOpenWorkItem={onOpenWorkItem} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ProgressBoard({
  title,
  rows,
  columnRows,
  allWorkItems,
}: {
  title: string;
  rows: readonly PersonProgress[];
  /** Full team rows used so every person shares the same status columns. */
  columnRows: readonly PersonProgress[];
  allWorkItems: readonly WorkItemSummary[];
}): React.JSX.Element {
  const [expandedNames, setExpandedNames] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const { openView, modal: workItemModal } = useWorkItemView();

  function onOpenWorkItem(id: number): void {
    void openView(id);
  }

  if (rows.length === 0) {
    return (
      <Card size="small" title={title}>
        <p className="m-0 text-slate-500">No team members to show for this team.</p>
      </Card>
    );
  }

  const states = collectStateColumns(columnRows);

  function toggle(name: string): void {
    setExpandedNames((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function expandAll(): void {
    setExpandedNames(new Set(rows.map((person) => person.displayName)));
  }

  function collapseAll(): void {
    setExpandedNames(new Set());
  }

  return (
    <>
      {workItemModal}
      <Card
        size="small"
        title={title}
        extra={
          <div className="flex gap-2">
            <Button size="small" onClick={expandAll}>
              Expand all
            </Button>
            <Button size="small" onClick={collapseAll}>
              Collapse all
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          {rows.map((person) => {
            const expanded = expandedNames.has(person.displayName);
            return (
              <div
                className="border-b border-slate-200 last:border-b-0 dark:border-slate-700"
                key={person.displayName}
              >
                <MemberSummaryRow
                  expanded={expanded}
                  person={person}
                  states={states}
                  onToggle={() => toggle(person.displayName)}
                />
                {expanded && states.length > 0 ? (
                  <MemberDetailBoard
                    allWorkItems={allWorkItems}
                    person={person}
                    states={states}
                    onOpenWorkItem={onOpenWorkItem}
                  />
                ) : null}
                {expanded && states.length === 0 ? (
                  <p className="m-0 border-t border-slate-200 px-3 py-2 text-sm text-slate-500 dark:border-slate-700">
                    No work items in this sprint.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
