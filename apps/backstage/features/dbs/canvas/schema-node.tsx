"use client";

import { useEffect, useState } from "react";

import {
  ApartmentOutlined,
  CloseOutlined,
  EyeOutlined,
  ExpandOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Button, Popover, Tag, Tooltip } from "antd";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DatabaseColumn, DatabaseObjectKind } from "@/features/dbs/queries";
import { KIND_COLOR, KIND_LABEL } from "@/features/dbs/kind-style";
import { isExpandConnectionsDisabled } from "@/features/dbs/canvas/connected-objects";
import { ExpandConnectionsPopoverContent } from "@/features/dbs/canvas/expand-connections-popover";

export type SchemaNodeObject = {
  id: string;
  schema: string;
  name: string;
  kind: DatabaseObjectKind;
};

export type SchemaNodeConnected = SchemaNodeObject;

export type SchemaNodeData = {
  object: SchemaNodeObject;
  columns: readonly DatabaseColumn[] | undefined;
  dependencyCount: number;
  collapsed: boolean;
  active: boolean;
  fkNeighbors: SchemaNodeConnected[];
  allShallow: SchemaNodeConnected[];
  /** True after relationships/deps/dependents have been fetched for this node. */
  connectionsLoaded: boolean;
  expanding: boolean;
  onPeek: (objectId: string) => void;
  onEnsureConnections: (objectId: string) => void;
  onExpandSelected: (objectId: string, selectedIds: string[]) => void;
  onToggleCollapse: (objectId: string) => void;
  onRemove: (objectId: string) => void;
};

const edgeHandleStyle = {
  top: "50%",
  opacity: 0,
  transform: "translateY(-50%)",
} as const;

function detailSummary(
  kind: DatabaseObjectKind,
  columns: readonly DatabaseColumn[] | undefined,
  dependencyCount: number,
): string {
  if (kind === "table" || kind === "view") {
    if (columns === undefined) {
      return "Peek for columns";
    }
    const count = columns.length;
    return `${count} ${count === 1 ? "column" : "columns"}`;
  }
  return `${dependencyCount} dependencies`;
}

/** Columns shown when Expand details is open — full list, never capped. */
export function columnsForExpandedNode(
  columns: readonly DatabaseColumn[] | undefined,
): readonly DatabaseColumn[] {
  return columns ?? [];
}

export const SchemaNode = function SchemaNode({
  data,
  selected,
}: NodeProps & { data: SchemaNodeData }): React.JSX.Element {
  const object = data.object;
  const columns = columnsForExpandedNode(data.columns);
  const summary = detailSummary(
    object.kind,
    data.columns,
    data.dependencyCount,
  );
  const highlightShadow = selected
    ? "0 0 0 2px rgba(14, 165, 233, 0.9), 0 14px 38px rgba(15, 23, 42, 0.18)"
    : data.active
      ? "0 0 0 2px rgba(14, 165, 233, 0.55), 0 12px 28px rgba(15, 23, 42, 0.14)"
      : undefined;

  const [expandOpen, setExpandOpen] = useState(false);
  const [pendingExpandOpen, setPendingExpandOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const fkNeighbors = data.fkNeighbors;
  const allShallow = data.allShallow;
  const expandDisabled = isExpandConnectionsDisabled(
    data.connectionsLoaded,
    allShallow.length,
    data.expanding,
  );

  useEffect(() => {
    if (!pendingExpandOpen || data.expanding) {
      return;
    }
    setPendingExpandOpen(false);
    if (!data.connectionsLoaded || allShallow.length === 0) {
      return;
    }
    setSelectedIds(new Set(fkNeighbors.map((item) => item.id)));
    setExpandOpen(true);
  }, [
    pendingExpandOpen,
    data.expanding,
    data.connectionsLoaded,
    allShallow.length,
    fkNeighbors,
  ]);

  function openExpandPopover(): void {
    setSelectedIds(new Set(fkNeighbors.map((item) => item.id)));
    setExpandOpen(true);
  }

  function handleExpandOpenChange(open: boolean): void {
    if (!open) {
      setExpandOpen(false);
      setPendingExpandOpen(false);
      return;
    }
    if (!data.connectionsLoaded) {
      setPendingExpandOpen(true);
      data.onEnsureConnections(object.id);
      return;
    }
    if (allShallow.length === 0) {
      return;
    }
    openExpandPopover();
  }

  const expandContent = (() => {
    if (data.expanding) {
      return (
        <div className="py-1 text-sm text-slate-500">Loading connections…</div>
      );
    }
    if (allShallow.length === 0) {
      return (
        <div className="py-1 text-sm text-slate-500">No connections found</div>
      );
    }
    return (
      <ExpandConnectionsPopoverContent
        fkNeighbors={fkNeighbors}
        allShallow={allShallow}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onConfirm={(ids) => {
          setExpandOpen(false);
          data.onExpandSelected(object.id, ids);
        }}
      />
    );
  })();

  return (
    <div
      className="database-node overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-300/35"
      aria-label={`${object.schema}.${object.name}`}
      aria-busy={data.expanding}
      style={{ width: 288, boxShadow: highlightShadow }}
    >
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!bg-cyan-400"
        style={edgeHandleStyle}
      />
      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        className="!bg-cyan-400"
        style={edgeHandleStyle}
      />
      <Handle
        id="source-left"
        type="source"
        position={Position.Left}
        className="!bg-cyan-400"
        style={edgeHandleStyle}
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!bg-cyan-400"
        style={edgeHandleStyle}
      />

      <div className="flex items-start justify-between gap-3 border-b border-slate-200/90 px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">
            {object.name}
          </div>
          <div className="truncate text-xs text-slate-500">{object.schema}</div>
        </div>
        <Tag color={KIND_COLOR[object.kind] ?? "default"} className="m-0">
          {KIND_LABEL[object.kind] ?? object.kind}
        </Tag>
      </div>

      {!data.collapsed ? (
        <div className="nodrag nowheel max-h-52 overflow-y-auto px-3 py-2">
          {columns.length > 0 ? (
            <div className="space-y-1">
              {columns.map((column) => (
                <div
                  key={column.name}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md px-1.5 py-1 text-left"
                >
                  <span className="truncate text-xs text-slate-700">
                    {column.name}
                  </span>
                  <span className="truncate text-[11px] text-slate-500">
                    {column.primaryKey
                      ? "PK"
                      : column.nullable
                        ? "NULL"
                        : "NOT NULL"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-5 text-xs text-slate-500">
              <ApartmentOutlined />
              <span>{summary}</span>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-1 border-t border-slate-200/90 px-2 py-2">
        <span className="mr-auto truncate text-[11px] text-slate-500">
          {summary}
        </span>
        <Tooltip title="Quick peek">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              data.onPeek(object.id);
            }}
          />
        </Tooltip>
        <Popover
          open={expandOpen}
          onOpenChange={handleExpandOpenChange}
          trigger="click"
          placement="bottomRight"
          title="Add connections to canvas"
          content={expandContent}
        >
          <Tooltip title="Expand connections">
            <Button
              size="small"
              icon={<ExpandOutlined />}
              loading={data.expanding}
              disabled={expandDisabled}
              onClick={(event) => {
                event.stopPropagation();
              }}
            />
          </Tooltip>
        </Popover>
        <Tooltip title={data.collapsed ? "Expand details" : "Collapse details"}>
          <Button
            size="small"
            icon={
              data.collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
            }
            onClick={(event) => {
              event.stopPropagation();
              data.onToggleCollapse(object.id);
            }}
          />
        </Tooltip>
        <Tooltip title="Remove from canvas">
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={(event) => {
              event.stopPropagation();
              data.onRemove(object.id);
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};
