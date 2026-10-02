"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Space, Typography } from "antd";
import { DataTable } from "@/shared/ui/data-table";
import type { ColumnFilterInput, DataFixBrowse, DataFixCellEdit } from "@hrms/db";
import { dataFixColumnWidth, dataFixTableScrollX } from "@/features/employer/data-fix/data-fix-columns";
import {
  commitDataFixBatchChange,
  previewDataFixBatch,
} from "@/features/employer/data-fix/mutations";
import { browseTable } from "@/features/employer/data-fix/queries";
import { formatDate } from "@/shared/format-date";
import { ConfirmWriteModal, HighlightMatch } from "@/shared/ui";

const BROWSE_LIMIT = 100;

type RowRecord = Record<string, unknown> & { __rowKey: string };

const COMPACT_SCROLL_Y = 520;
const EXPANDED_SCROLL_Y = "calc(100vh - 280px)";

export function DataFixRows({
  employerId,
  schema,
  table,
  writesEnabled,
  expanded,
  newestFirst = false,
  columnFilters = [],
  onCommitted,
  onEditsChange,
  onLoaded,
}: {
  employerId: number;
  schema: string;
  table: string;
  writesEnabled: boolean;
  expanded: boolean;
  newestFirst?: boolean;
  columnFilters?: readonly ColumnFilterInput[];
  onCommitted: () => void;
  onEditsChange?: (count: number) => void;
  onLoaded?: (browse: DataFixBrowse) => void;
}): React.JSX.Element {
  const [applied, setApplied] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [browse, setBrowse] = useState<DataFixBrowse | null>(null);
  const [queryScript, setQueryScript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<DataFixCellEdit[]>([]);
  const [editing, setEditing] = useState<{ rowKey: string; column: string } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const requestedFilters = JSON.stringify(columnFilters);
  const [activeFilters, setActiveFilters] = useState<ColumnFilterInput[]>([...columnFilters]);
  const [activeFilterKey, setActiveFilterKey] = useState(requestedFilters);
  const onEditsChangeRef = useRef(onEditsChange);
  onEditsChangeRef.current = onEditsChange;
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    onEditsChangeRef.current?.(edits.length);
  }, [edits.length]);

  useEffect(() => {
    if (requestedFilters === activeFilterKey) {
      return;
    }
    if (edits.length > 0) {
      setEditError("Commit or discard edits before filtering again.");
      return;
    }
    setActiveFilters(JSON.parse(requestedFilters) as ColumnFilterInput[]);
    setActiveFilterKey(requestedFilters);
    setEditing(null);
    setEditError(null);
  }, [activeFilterKey, edits.length, requestedFilters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void browseTable({
      employerId,
      schema,
      table,
      value: applied,
      newestFirst,
      columnFilters: activeFilters,
    })
      .then((result) => {
        if (!cancelled) {
          const { queryScript: script, ...next } = result;
          setBrowse(next);
          setQueryScript(script);
          setError(null);
          onLoadedRef.current?.(next);
        }
      })
      .catch((browseError: unknown) => {
        if (!cancelled) {
          setBrowse(null);
          setQueryScript("");
          setError(browseError instanceof Error ? browseError.message : "Could not read this table.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeFilters, applied, employerId, newestFirst, reloadKey, schema, table]);

  const keyColumns = browse?.keyColumns ?? [];
  const canEdit = writesEnabled && keyColumns.length > 0 && Boolean(browse?.employerColumn);
  const rows: RowRecord[] = (browse?.rows ?? []).map((row, index) => ({
    ...row,
    __rowKey: keyColumns.length > 0 ? rowKey(row, keyColumns) : String(index),
  }));

  function applySearch(value: string): void {
    if (edits.length > 0) {
      setEditError("Commit or discard edits before searching again.");
      return;
    }
    setApplied(value.trim());
    setEditing(null);
  }

  function saveCell(row: RowRecord, column: string, nullable: boolean, draft: string): void {
    const previous = originalText(row, column);
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : trimmed;
    setEditing(null);
    if (next == null && !nullable) {
      setEditError(`${column} does not allow NULL.`);
      return;
    }
    if (next === previous) {
      setEdits((current) =>
        current.filter(
          (edit) =>
            !(rowKeyFromKeys(edit.keys, keyColumns) === row.__rowKey && edit.column === column),
        ),
      );
      setEditError(null);
      return;
    }
    const keys = keyValues(row, keyColumns);
    setEdits((current) => {
      const rest = current.filter(
        (edit) => !(rowKeyFromKeys(edit.keys, keyColumns) === row.__rowKey && edit.column === column),
      );
      return [...rest, { keys, column, previous, next }];
    });
    setEditError(null);
  }

  const note = browse ? browseNote(browse, newestFirst) : null;

  return (
    <div className="flex flex-col gap-2">
      <TableFind onSearch={applySearch} />
      {note ? <Typography.Text type="secondary">{note}</Typography.Text> : null}
      {!browse?.employerColumn && browse ? (
        <Alert showIcon type="warning" title="This table has no Employerid column, so it cannot be updated from Data Fix." />
      ) : null}
      {browse?.employerColumn && keyColumns.length === 0 ? (
        <Alert showIcon type="warning" title="This table has no primary key, so rows cannot be updated here." />
      ) : null}
      {canEdit ? (
        <Typography.Text type="secondary">
          Click a cell to edit it. Commit writes every change in one transaction.
        </Typography.Text>
      ) : null}
      {error ? <Alert showIcon type="error" title={error} /> : null}
      {editError ? <Alert showIcon type="error" title={editError} /> : null}
      <DataTable<RowRecord>
        queryScript={queryScript}
        onRefresh={() => {
          setReloadKey((current) => current + 1);
        }}
        skipRefresh={edits.length > 0}
        loading={loading}
        locale={{ emptyText: applied ? "No rows match." : "This table has no rows." }}
        pagination={false}
        rowKey="__rowKey"
        scroll={{
          x: dataFixTableScrollX(browse?.columns ?? []),
          y: expanded ? EXPANDED_SCROLL_Y : COMPACT_SCROLL_Y,
        }}
        size="small"
        tableLayout="fixed"
        dataSource={rows}
        columns={(browse?.columns ?? []).map((column) => ({
          title: column.name,
          dataIndex: column.name,
          key: column.name,
          width: dataFixColumnWidth(column.name, column.typeName),
          ellipsis: { showTitle: true },
          onCell: (row: RowRecord) => {
            const dirty = edits.some(
              (edit) => rowKeyFromKeys(edit.keys, keyColumns) === row.__rowKey && edit.column === column.name,
            );
            const editable = canEdit && column.editable;
            return {
              style: {
                backgroundColor: dirty ? "#fff7e6" : undefined,
                cursor: editable ? "text" : undefined,
              },
              onClick: () => {
                if (!editable) {
                  return;
                }
                if (editing?.rowKey === row.__rowKey && editing.column === column.name) {
                  return;
                }
                setEditError(null);
                setEditing({ rowKey: row.__rowKey, column: column.name });
              },
            };
          },
          render: (value: unknown, row: RowRecord) => {
            const pending = edits.find(
              (edit) => rowKeyFromKeys(edit.keys, keyColumns) === row.__rowKey && edit.column === column.name,
            );
            const shown = pending ? (pending.next ?? null) : value;
            const isEditing = editing?.rowKey === row.__rowKey && editing.column === column.name;
            if (isEditing) {
              return (
                <CellEditor
                  initial={shown == null ? "" : rawText(shown)}
                  onCancel={() => {
                    setEditing(null);
                  }}
                  onSave={(draft) => {
                    saveCell(row, column.name, column.nullable, draft);
                  }}
                />
              );
            }
            const text = shown == null ? "—" : cellText(shown);
            const content = applied.length >= 2 ? <HighlightMatch query={applied} text={text} /> : text;
            return <span title={text}>{content}</span>;
          },
        }))}
      />
      <Space>
        <Button
          disabled={!canEdit || edits.length === 0}
          type="primary"
          onClick={() => {
            setConfirming(true);
          }}
        >
          {edits.length === 0 ? "Commit" : `Commit ${edits.length}`}
        </Button>
        <Button
          disabled={edits.length === 0}
          onClick={() => {
            setEdits([]);
            setEditing(null);
            setEditError(null);
          }}
        >
          Discard
        </Button>
        {!writesEnabled ? (
          <Typography.Text type="secondary">Writes are disabled for this environment.</Typography.Text>
        ) : null}
      </Space>
      {confirming ? (
        <ConfirmWriteModal
          hideTrigger
          buttonLabel="Commit"
          commitAction={commitDataFixBatchChange}
          open
          previewAction={() =>
            previewDataFixBatch({
              employerId,
              schema,
              table,
              changes: edits,
            })
          }
          successMessage={`${schema}.${table} updated.`}
          title={`Commit ${schema}.${table}`}
          onDone={() => {
            setConfirming(false);
            setEdits([]);
            setReloadKey((current) => current + 1);
            onCommitted();
          }}
          onOpenChange={(open) => {
            if (!open) {
              setConfirming(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function browseNote(browse: DataFixBrowse, newestFirst: boolean): string {
  const ordered = newestFirst && browse.columns.some((column) => column.identity || column.primaryKey);
  if (browse.truncated) {
    return ordered
      ? `More rows match. Showing the newest ${BROWSE_LIMIT}.`
      : `More rows match. Showing the first ${BROWSE_LIMIT}.`;
  }
  if (newestFirst && !ordered) {
    const scope = browse.employerFiltered ? `Up to ${BROWSE_LIMIT} rows for this employer.` : `Up to ${BROWSE_LIMIT} rows.`;
    return `${scope} This table has no identity or primary key, so the rows are not ordered newest first.`;
  }
  if (ordered) {
    return browse.employerFiltered
      ? `Up to ${BROWSE_LIMIT} newest rows for this employer.`
      : `Up to ${BROWSE_LIMIT} newest rows. This table is not limited to the employer.`;
  }
  return browse.employerFiltered
    ? `Up to ${BROWSE_LIMIT} rows for this employer.`
    : `Up to ${BROWSE_LIMIT} rows. This table is not limited to the employer.`;
}

function TableFind({ onSearch }: { onSearch: (value: string) => void }): React.JSX.Element {
  const [draft, setDraft] = useState("");
  return (
    <Space.Compact className="w-full">
      <Input
        allowClear
        placeholder="Find in this table, then press Enter"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onPressEnter={() => {
          onSearch(draft);
        }}
      />
      <Button
        onClick={() => {
          onSearch(draft);
        }}
      >
        Find
      </Button>
    </Space.Compact>
  );
}

function CellEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (draft: string) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState(initial);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  function save(): void {
    onSave(draftRef.current);
  }

  return (
    <Input
      autoFocus
      size="small"
      value={draft}
      onBlur={save}
      onChange={(event) => {
        const next = event.target.value;
        draftRef.current = next;
        setDraft(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          save();
        }
        if (event.key === "Escape") {
          draftRef.current = initial;
          onCancel();
        }
      }}
    />
  );
}

function rowKey(row: Record<string, unknown>, keyColumns: readonly string[]): string {
  return keyColumns.map((name) => rawText(cellValue(row, name))).join("\u0001");
}

function rowKeyFromKeys(keys: Record<string, string | null>, keyColumns: readonly string[]): string {
  return keyColumns.map((name) => keys[name] ?? "").join("\u0001");
}

function keyValues(row: Record<string, unknown>, keyColumns: readonly string[]): Record<string, string | null> {
  const keys: Record<string, string | null> = {};
  for (const name of keyColumns) {
    const value = cellValue(row, name);
    keys[name] = value == null ? null : rawText(value);
  }
  return keys;
}

function originalText(row: Record<string, unknown>, column: string): string | null {
  const value = cellValue(row, column);
  return value == null ? null : rawText(value);
}

function cellValue(row: Record<string, unknown>, name: string): unknown {
  if (name in row) {
    return row[name];
  }
  const found = Object.keys(row).find((key) => key.toLowerCase() === name.toLowerCase());
  return found ? row[found] : undefined;
}

function cellText(value: unknown): string {
  if (value == null) {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDate(value);
  }
  return String(value);
}

function rawText(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = value.slice(0, 10);
    const time = value.slice(11, 19);
    return time === "00:00:00" ? date : `${date}T${time}`;
  }
  return String(value);
}
