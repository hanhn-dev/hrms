"use client";

import { useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Segmented, Tag } from "antd";
import type { DatabaseObjectKind } from "@/features/dbs/queries";
import { KIND_COLOR, KIND_LABEL } from "@/features/dbs/kind-style";
import {
  MAX_EXPAND_PIN_BATCH,
  clampSelectionForPin,
  filterConnectedObjects,
  type ConnectedObjectRef,
} from "@/features/dbs/canvas/connected-objects";
import { VirtualList } from "@/features/dbs/canvas/virtual-list";

const ROW_HEIGHT = 36;
const LIST_MAX_HEIGHT = 260;

type ListScope = "fk" | "all";
type KindFilter = DatabaseObjectKind | "all";

const KIND_FILTER_OPTIONS: { label: string; value: KindFilter }[] = [
  { label: "All kinds", value: "all" },
  { label: "Tables", value: "table" },
  { label: "Views", value: "view" },
  { label: "Procs", value: "storedProcedure" },
  { label: "Funcs", value: "function" },
];

export function ExpandConnectionsPopoverContent({
  fkNeighbors,
  allShallow,
  selectedIds,
  onSelectedIdsChange,
  onConfirm,
}: {
  fkNeighbors: readonly ConnectedObjectRef[];
  allShallow: readonly ConnectedObjectRef[];
  selectedIds: ReadonlySet<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  onConfirm: (selectedIds: string[]) => void;
}): React.JSX.Element {
  const [scope, setScope] = useState<ListScope>("fk");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");

  const sourceList = scope === "fk" ? fkNeighbors : allShallow;
  const filtered = filterConnectedObjects(sourceList, search, kindFilter);
  const selectedInFiltered = filtered.filter((item) => selectedIds.has(item.id));
  const allFilteredSelected =
    filtered.length > 0 && selectedInFiltered.length === filtered.length;
  const someFilteredSelected =
    selectedInFiltered.length > 0 &&
    selectedInFiltered.length < filtered.length;
  const overCap = selectedIds.size > MAX_EXPAND_PIN_BATCH;
  const confirmDisabled = selectedIds.size === 0 || overCap;

  function toggleId(id: string): void {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedIdsChange(next);
  }

  function toggleFilteredSelection(): void {
    if (allFilteredSelected) {
      const next = new Set(selectedIds);
      for (const item of filtered) {
        next.delete(item.id);
      }
      onSelectedIdsChange(next);
      return;
    }
    const next = new Set(selectedIds);
    const room = Math.max(0, MAX_EXPAND_PIN_BATCH - next.size);
    const toAdd = filtered
      .map((item) => item.id)
      .filter((id) => !next.has(id))
      .slice(0, room);
    for (const id of toAdd) {
      next.add(id);
    }
    onSelectedIdsChange(next);
  }

  return (
    <div className="flex w-[420px] flex-col gap-2">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {fkNeighbors.length} FK · {allShallow.length} total shallow
        </span>
        <span>
          {selectedIds.size}/{MAX_EXPAND_PIN_BATCH} selected
        </span>
      </div>
      <Segmented
        size="small"
        block
        value={scope}
        options={[
          { label: `FK (${fkNeighbors.length})`, value: "fk" },
          { label: `All shallow (${allShallow.length})`, value: "all" },
        ]}
        onChange={(value) => {
          setScope(value as ListScope);
        }}
      />
      <Input
        size="small"
        prefix={<SearchOutlined className="text-slate-400" />}
        placeholder="Search connections…"
        value={search}
        allowClear
        onChange={(event) => {
          setSearch(event.target.value);
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      />
      <Segmented
        size="small"
        value={kindFilter}
        options={KIND_FILTER_OPTIONS}
        onChange={(value) => {
          setKindFilter(value as KindFilter);
        }}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allFilteredSelected}
          indeterminate={someFilteredSelected}
          disabled={filtered.length === 0}
          onChange={toggleFilteredSelection}
        />
        <span className="text-sm text-slate-600">
          Select visible (max {MAX_EXPAND_PIN_BATCH})
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="py-2 text-center text-sm text-slate-500">No matches</div>
      ) : (
        <VirtualList
          rowCount={filtered.length}
          rowHeight={ROW_HEIGHT}
          height={Math.min(
            LIST_MAX_HEIGHT,
            Math.max(ROW_HEIGHT, filtered.length * ROW_HEIGHT),
          )}
          rowRenderer={(index, style) => {
            const related = filtered[index];
            if (!related) {
              return null;
            }
            return (
              <label
                key={related.id}
                style={style}
                className="flex cursor-pointer items-center gap-2 px-1 hover:bg-slate-50"
              >
                <Checkbox
                  checked={selectedIds.has(related.id)}
                  onChange={() => {
                    toggleId(related.id);
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-sm" title={related.name}>
                  {related.name}
                </span>
                <Tag
                  color={KIND_COLOR[related.kind] ?? "default"}
                  className="m-0 shrink-0 text-[11px]"
                >
                  {KIND_LABEL[related.kind] ?? related.kind}
                </Tag>
              </label>
            );
          }}
        />
      )}
      {overCap ? (
        <div className="text-xs text-amber-700">
          Select at most {MAX_EXPAND_PIN_BATCH} ({selectedIds.size} selected)
        </div>
      ) : null}
      <Button
        size="small"
        type="primary"
        block
        disabled={confirmDisabled}
        onClick={(event) => {
          event.stopPropagation();
          onConfirm(clampSelectionForPin(Array.from(selectedIds)));
        }}
      >
        Add {Math.min(selectedIds.size, MAX_EXPAND_PIN_BATCH)} to canvas
      </Button>
    </div>
  );
}
