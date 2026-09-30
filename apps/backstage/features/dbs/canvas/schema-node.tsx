"use client";

import { memo, useMemo, useState } from "react";
import {
  ApartmentOutlined,
  CloseOutlined,
  EyeOutlined,
  ExpandOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Button, Checkbox, Popover, Tag, Tooltip } from "antd";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { DatabaseColumn, DatabaseObjectKind } from "@/features/dbs/queries";
import { KIND_COLOR, KIND_LABEL } from "@/features/dbs/kind-style";

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
  connectedObjects: SchemaNodeConnected[];
  onPeek: (objectId: string) => void;
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

export const SchemaNode = memo(function SchemaNode({
  data,
  selected,
}: NodeProps & { data: SchemaNodeData }): React.JSX.Element {
  const object = data.object;
  const columns = data.columns?.slice(0, 6) ?? [];
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const connectedObjects = data.connectedObjects;

  const allSelected =
    connectedObjects.length > 0 &&
    selectedIds.size === connectedObjects.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < connectedObjects.length;

  const expandContent = useMemo(() => {
    if (connectedObjects.length === 0) {
      return (
        <div className="py-1 text-sm text-slate-500">No connections found</div>
      );
    }
    return (
      <div className="flex w-80 flex-col gap-2">
        <div className="max-h-64 space-y-1 overflow-auto">
          {connectedObjects.map((related) => (
            <label
              key={related.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50"
            >
              <Checkbox
                checked={selectedIds.has(related.id)}
                onChange={() => {
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (next.has(related.id)) {
                      next.delete(related.id);
                    } else {
                      next.add(related.id);
                    }
                    return next;
                  });
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                {related.name}
              </span>
              <Tag
                color={KIND_COLOR[related.kind] ?? "default"}
                className="m-0 shrink-0 text-[11px]"
              >
                {KIND_LABEL[related.kind] ?? related.kind}
              </Tag>
            </label>
          ))}
        </div>
        <Button
          size="small"
          type="primary"
          block
          disabled={selectedIds.size === 0}
          onClick={(event) => {
            event.stopPropagation();
            setExpandOpen(false);
            data.onExpandSelected(object.id, Array.from(selectedIds));
          }}
        >
          Add {selectedIds.size} to canvas
        </Button>
      </div>
    );
  }, [connectedObjects, data, object.id, selectedIds]);

  return (
    <div
      className="database-node overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-300/35"
      aria-label={`${object.schema}.${object.name}`}
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
        <div className="max-h-52 overflow-hidden px-3 py-2">
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
          onOpenChange={(open) => {
            if (open) {
              setSelectedIds(new Set(connectedObjects.map((item) => item.id)));
            }
            setExpandOpen(open);
          }}
          trigger="click"
          placement="bottomRight"
          title={
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={() => {
                  setSelectedIds(
                    allSelected
                      ? new Set()
                      : new Set(connectedObjects.map((item) => item.id)),
                  );
                }}
              />
              <span>Add connections to canvas</span>
            </div>
          }
          content={expandContent}
        >
          <Tooltip title="Expand connections">
            <Button
              size="small"
              icon={<ExpandOutlined />}
              disabled={connectedObjects.length === 0}
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
});
