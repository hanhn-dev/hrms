"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input, Popover, Space, Table, Tooltip, Typography } from "antd";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import {
  listInspectorTableColumns,
  type ScriptObjectKind,
} from "@/features/employer/inspector/queries";
import type { SqlSymbol } from "@/features/employer/inspector/script-symbols";
import {
  columnRowClass,
  filterTableColumnRows,
  usedObjectPopoverContent,
  type TableColumnRow,
} from "@/features/employer/inspector/script-used-object-popover";
import { HighlightMatch } from "@/shared/ui/highlight-match";

const GROUP_ORDER: ScriptObjectKind[] = [
  "table",
  "view",
  "storedProcedure",
  "function",
];

const GROUP_LABEL: Record<ScriptObjectKind, string> = {
  table: "Tables",
  view: "Views",
  storedProcedure: "Stored procedures",
  function: "Functions",
};

export type UsedObject = {
  schema: string;
  name: string;
  kind: ScriptObjectKind;
};

function TableColumnList({
  schema,
  name,
  open,
}: {
  schema: string;
  name: string;
  open: boolean;
}): React.JSX.Element {
  const [rows, setRows] = useState<TableColumnRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const visibleRows = useMemo(
    () => (rows ? filterTableColumnRows(rows, query) : []),
    [query, rows],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setRows(null);
    setQuery("");
    setError(null);
    void listInspectorTableColumns({ schema, name })
      .then((columns) => {
        if (cancelled) {
          return;
        }
        const content = usedObjectPopoverContent("table", columns);
        if (content.kind === "columns") {
          setRows(content.rows);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [name, open, schema]);

  if (error) {
    return <Typography.Text type="danger">{error}</Typography.Text>;
  }
  if (!rows) {
    return <Typography.Text type="secondary">Loading columns…</Typography.Text>;
  }
  if (rows.length === 0) {
    return <Typography.Text type="secondary">No columns.</Typography.Text>;
  }
  return (
    <div className="flex w-[36rem] flex-col gap-2">
      <Input
        allowClear
        placeholder="Search columns"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <Table<TableColumnRow>
        columns={[
          {
            title: "Column",
            dataIndex: "name",
            ellipsis: true,
            render: (value: string) => <HighlightMatch query={query} text={value} />,
          },
          {
            title: "Type",
            dataIndex: "type",
            ellipsis: true,
            render: (value: string) => <HighlightMatch query={query} text={value} />,
          },
          {
            title: "Length",
            dataIndex: "length",
            width: 88,
            render: (value: string) => <HighlightMatch query={query} text={value} />,
          },
          { title: "Null", dataIndex: "nullable", width: 72 },
          { title: "Identity", dataIndex: "identity", width: 80 },
        ]}
        dataSource={visibleRows}
        locale={{ emptyText: "No matching columns." }}
        pagination={false}
        rowClassName={columnRowClass}
        rowKey="name"
        scroll={{ y: 256 }}
        size="small"
      />
    </div>
  );
}

function objectKey(schema: string, name: string): string {
  return `${schema}.${name}`.toLowerCase();
}

const NAME_GROUPS: Array<{ kind: SqlSymbol["kind"]; label: string }> = [
  { kind: "parameter", label: "Parameters" },
  { kind: "local", label: "Locals" },
  { kind: "alias", label: "Aliases" },
];

export function ScriptUsedObjects({
  refs,
  kinds,
  kindsReady,
  current,
  onView,
  onExecute,
  symbols,
  onJump,
}: {
  refs: ReadonlyArray<{ schema: string; name: string }>;
  kinds: Readonly<Record<string, ScriptObjectKind>>;
  kindsReady: boolean;
  current: { schema: string; name: string };
  onView: (object: UsedObject) => void;
  onExecute: (object: UsedObject) => void;
  symbols: readonly SqlSymbol[];
  onJump: (symbol: SqlSymbol) => void;
}): React.JSX.Element {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const currentKey = objectKey(current.schema, current.name);
  const items: UsedObject[] = [];
  for (const ref of refs) {
    const kind = kinds[objectKey(ref.schema, ref.name)];
    if (kind) {
      items.push({ schema: ref.schema, name: ref.name, kind });
    }
  }

  return (
    <aside className="h-full overflow-auto p-3">
      <Typography.Text strong>Used in this script</Typography.Text>
      {!kindsReady ? (
        <Typography.Paragraph className="!mb-0 mt-2" type="secondary">
          Resolving objects…
        </Typography.Paragraph>
      ) : null}
      {kindsReady && items.length === 0 ? (
        <Typography.Paragraph className="!mb-0 mt-2" type="secondary">
          No catalog objects in this script.
        </Typography.Paragraph>
      ) : null}
      {kindsReady
        ? GROUP_ORDER.map((kind) => {
            const group = items.filter((item) => item.kind === kind);
            if (group.length === 0) {
              return null;
            }
            return (
              <div className="mt-3" key={kind}>
                <Typography.Text type="secondary">{GROUP_LABEL[kind]}</Typography.Text>
                <div className="mt-1 flex flex-col">
                  {group.map((item) => {
                    const key = `${item.kind}:${objectKey(item.schema, item.name)}`;
                    const isCurrent = objectKey(item.schema, item.name) === currentKey;
                    const qualifiedName = `${item.schema}.${item.name}`;
                    const popover = usedObjectPopoverContent(item.kind, null);
                    return (
                      <Popover
                        key={key}
                        content={
                          popover.kind === "columns" ? (
                            <TableColumnList
                              name={item.name}
                              open={openKey === key}
                              schema={item.schema}
                            />
                          ) : (
                            <Space className="w-40" orientation="vertical">
                              {popover.actions.map((action) =>
                                action === "View script" ? (
                                  <Button
                                    className="w-full"
                                    disabled={isCurrent}
                                    key={action}
                                    onClick={() => {
                                      setOpenKey(null);
                                      onView(item);
                                    }}
                                  >
                                    {action}
                                  </Button>
                                ) : (
                                  <Button
                                    className="w-full"
                                    key={action}
                                    type="primary"
                                    onClick={() => {
                                      setOpenKey(null);
                                      onExecute(item);
                                    }}
                                  >
                                    {action}
                                  </Button>
                                ),
                              )}
                            </Space>
                          )
                        }
                        open={openKey === key}
                        placement="left"
                        trigger="click"
                        onOpenChange={(open) => {
                          setOpenKey(open ? key : null);
                        }}
                      >
                        <Tooltip
                          placement="topLeft"
                          title={qualifiedName}
                          open={openKey === key ? false : undefined}
                        >
                          <Button
                            aria-current={isCurrent ? "true" : undefined}
                            className={
                              isCurrent
                                ? "!flex !h-auto w-full min-w-0 items-start justify-start gap-2 overflow-hidden rounded bg-slate-100 px-1 py-1 text-left !whitespace-normal dark:bg-slate-800"
                                : "!flex !h-auto w-full min-w-0 items-center justify-start gap-2 overflow-hidden px-1 text-left !whitespace-normal"
                            }
                            type="text"
                          >
                            <span
                              className={
                                isCurrent
                                  ? "mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                                  : "inline-block h-2 w-2 shrink-0 rounded-full"
                              }
                              style={{ background: KIND_COLOR[item.kind] }}
                            />
                            <span className="min-w-0 flex-1">
                              <span
                                className={
                                  isCurrent
                                    ? "block truncate font-mono text-xs font-semibold"
                                    : "block truncate font-mono text-xs"
                                }
                              >
                                {qualifiedName}
                              </span>
                              {isCurrent ? (
                                <span className="block truncate font-sans text-[11px] font-normal leading-4 text-slate-500">
                                  This script
                                </span>
                              ) : null}
                            </span>
                          </Button>
                        </Tooltip>
                      </Popover>
                    );
                  })}
                </div>
              </div>
            );
          })
        : null}
      {symbols.length > 0 ? (
        <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
          <Typography.Text strong>Names</Typography.Text>
          {NAME_GROUPS.map((group) => {
            const rows = symbols.filter((symbol) => symbol.kind === group.kind);
            if (rows.length === 0) {
              return null;
            }
            return (
              <div className="mt-3" key={group.kind}>
                <Typography.Text type="secondary">{group.label}</Typography.Text>
                <div className="mt-1 flex flex-col">
                  {rows.map((symbol) => (
                    <Tooltip key={symbol.id} placement="topLeft" title={symbol.hint}>
                      <Button
                        className="!flex !h-auto w-full min-w-0 items-center justify-start overflow-hidden px-1 text-left !whitespace-normal"
                        type="text"
                        onClick={() => {
                          onJump(symbol);
                        }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs">{symbol.name}</span>
                          {symbol.kind === "alias" && symbol.target ? (
                            <span className="block truncate font-sans text-[11px] font-normal leading-4 text-slate-500">
                              {symbol.target}
                            </span>
                          ) : symbol.typeText ? (
                            <span className="block truncate font-sans text-[11px] font-normal leading-4 text-slate-500">
                              {symbol.typeText}
                            </span>
                          ) : null}
                        </span>
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
