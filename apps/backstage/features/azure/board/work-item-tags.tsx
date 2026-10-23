"use client";

import { Tag } from "antd";
import type { BoardChild, BoardRelation } from "@/features/azure/board/group-board";
import { workItemStateColor, workItemTypeColor } from "@/features/azure/board/work-item-appearance";
import { HighlightMatch } from "@/shared/ui";

export function WorkItemTypeTag({ type }: { type: string }): React.JSX.Element {
  return <Tag color={workItemTypeColor(type)}>{type}</Tag>;
}

export function WorkItemStateTag({ state }: { state: string }): React.JSX.Element {
  return <Tag color={workItemStateColor(state)}>{state}</Tag>;
}

export function ParentLink({
  parent,
  query,
}: {
  parent: BoardRelation;
  query?: string;
}): React.JSX.Element {
  return (
    <div className="text-sm">
      <span className="text-slate-500">Parent </span>
      <a href={parent.url} rel="noopener noreferrer" target="_blank">
        #{parent.id}
      </a>
      {parent.type ? (
        <span className="ml-1">
          <WorkItemTypeTag type={parent.type} />
        </span>
      ) : null}
      {parent.title ? (
        <div>
          <HighlightMatch query={query} text={parent.title} />
        </div>
      ) : (
        <span className="text-slate-500"> not in this sprint</span>
      )}
    </div>
  );
}

export function ChildList({
  children,
  query,
}: {
  children: BoardChild[];
  query?: string;
}): React.JSX.Element | null {
  if (children.length === 0) {
    return null;
  }
  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <div className="mb-1 text-xs text-slate-500">Child items</div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {children.map((child) => (
          <li className="text-sm" key={child.id}>
            <a href={child.url} rel="noopener noreferrer" target="_blank">
              #{child.id}
            </a>{" "}
            <WorkItemTypeTag type={child.type} />{" "}
            <HighlightMatch query={query} text={child.title} />{" "}
            <WorkItemStateTag state={child.state} />
          </li>
        ))}
      </ul>
    </div>
  );
}
