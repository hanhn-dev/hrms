"use client";

import { useState } from "react";
import { Button, Popover, Space, Tooltip, Typography } from "antd";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import type { SqlSymbol } from "@/features/employer/inspector/script-symbols";
import type { ScriptObjectKind } from "@/features/employer/inspector/queries";

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
                    return (
                      <Popover
                        key={key}
                        content={
                          <Space className="w-40" orientation="vertical">
                            <Button
                              className="w-full"
                              disabled={isCurrent}
                              onClick={() => {
                                setOpenKey(null);
                                onView(item);
                              }}
                            >
                              View script
                            </Button>
                            <Button
                              className="w-full"
                              type="primary"
                              onClick={() => {
                                setOpenKey(null);
                                onExecute(item);
                              }}
                            >
                              Execute
                            </Button>
                          </Space>
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
