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
  onOpenWorkItem,
}: {
  parent: BoardRelation;
  query?: string;
  onOpenWorkItem?: (id: number) => void;
}): React.JSX.Element {
  const openParent = () => {
    onOpenWorkItem?.(parent.id);
  };

  return (
    <div className="text-sm">
      <span className="text-slate-500">Parent </span>
      {onOpenWorkItem ? (
        <button
          className="cursor-pointer border-0 bg-transparent p-0 text-blue-600 hover:underline"
          type="button"
          onClick={openParent}
        >
          #{parent.id}
        </button>
      ) : (
        <a href={parent.url} rel="noopener noreferrer" target="_blank">
          #{parent.id}
        </a>
      )}
      {parent.type ? (
        <span className="ml-1">
          <WorkItemTypeTag type={parent.type} />
        </span>
      ) : null}
      {parent.title ? (
        <div>
          {onOpenWorkItem ? (
            <button
              className="cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
              type="button"
              onClick={openParent}
            >
              <HighlightMatch query={query} text={parent.title} />
            </button>
          ) : (
            <HighlightMatch query={query} text={parent.title} />
          )}
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
  onOpenWorkItem,
}: {
  children: BoardChild[];
  query?: string;
  onOpenWorkItem?: (id: number) => void;
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
            {onOpenWorkItem ? (
              <button
                className="cursor-pointer border-0 bg-transparent p-0 text-blue-600 hover:underline"
                type="button"
                onClick={() => {
                  onOpenWorkItem(child.id);
                }}
              >
                #{child.id}
              </button>
            ) : (
              <a href={child.url} rel="noopener noreferrer" target="_blank">
                #{child.id}
              </a>
            )}{" "}
            <WorkItemTypeTag type={child.type} />{" "}
            {onOpenWorkItem ? (
              <button
                className="cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                type="button"
                onClick={() => {
                  onOpenWorkItem(child.id);
                }}
              >
                <HighlightMatch query={query} text={child.title} />
              </button>
            ) : (
              <HighlightMatch query={query} text={child.title} />
            )}{" "}
            <WorkItemStateTag state={child.state} />
          </li>
        ))}
      </ul>
    </div>
  );
}
