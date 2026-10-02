"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Segmented, Space, Splitter, Tabs, Tooltip, Typography } from "antd";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import { SearchSelect } from "@/shared/ui";
import { scriptObjectRefs, tokenizeSql } from "@/features/employer/inspector/script-sql";
import { bindSql } from "@/features/employer/inspector/script-symbols";
import { formatSql } from "@/features/employer/inspector/script-format";
import { ScriptCompare } from "@/features/employer/inspector/script-compare";
import { ScriptExecuteModal } from "@/features/employer/inspector/script-execute-modal";
import { SqlScript } from "@/features/employer/inspector/script-view";
import {
  ScriptUsedObjects,
  type UsedObject,
} from "@/features/employer/inspector/script-used-objects";
import {
  getModuleDefinition,
  listInspectorTables,
  listModules,
  resolveScriptObject,
  resolveScriptObjectKinds,
  type InspectorObjectKind,
  type ModuleKind,
  type ResolvedScript,
  type ScriptObjectKind,
} from "@/features/employer/inspector/queries";

const MIN_QUERY_LENGTH = 2;

type ScriptTab = {
  key: string;
  schema: string;
  name: string;
  kind: InspectorObjectKind | "lookup";
  loading: boolean;
  error: string | null;
  script: ResolvedScript | null;
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);
  return debounced;
}

function splitQualified(qualified: string): { schema: string; name: string } {
  const dot = qualified.indexOf(".");
  if (dot === -1) {
    return { schema: "dbo", name: qualified };
  }
  return {
    schema: qualified.slice(0, dot),
    name: qualified.slice(dot + 1),
  };
}

function scriptKey(kind: string, schema: string, name: string): string {
  return `${kind}:${schema}.${name}`.toLowerCase();
}

function lookupKey(schema: string, name: string): string {
  return `lookup:${schema}.${name}`.toLowerCase();
}

function sameObject(tab: ScriptTab, schema: string, name: string): boolean {
  return (
    tab.schema.toLowerCase() === schema.toLowerCase() &&
    tab.name.toLowerCase() === name.toLowerCase() &&
    tab.kind !== "lookup"
  );
}

export function ScriptPanel({
  writesEnabled,
}: {
  writesEnabled: boolean;
}): React.JSX.Element {
  const [kind, setKind] = useState<InspectorObjectKind>("storedProcedure");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [options, setOptions] = useState<Array<{ schema: string; name: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [tabs, setTabs] = useState<ScriptTab[]>([]);
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setOptions([]);
      setLoadingOptions(false);
      return;
    }

    let cancelled = false;
    setLoadingOptions(true);
    const request =
      kind === "table"
        ? listInspectorTables({ q: debouncedQuery })
        : listModules({ kind, q: debouncedQuery });
    void request
      .then((rows) => {
        if (!cancelled) {
          setOptions(rows);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setOptions([]);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [kind, debouncedQuery]);

  function focusExisting(schema: string, name: string): boolean {
    const existing = tabs.find(
      (tab) => sameObject(tab, schema, name) || tab.key === lookupKey(schema, name),
    );
    if (!existing) {
      return false;
    }
    setActiveKey(existing.key);
    return true;
  }

  function openModule(schema: string, name: string, moduleKind: ModuleKind): void {
    if (focusExisting(schema, name)) {
      return;
    }
    const key = scriptKey(moduleKind, schema, name);
    setError(null);
    setActiveKey(key);
    setTabs((current) => {
      if (current.some((tab) => tab.key === key)) {
        return current;
      }
      return [
        ...current,
        {
          key,
          schema,
          name,
          kind: moduleKind,
          loading: true,
          error: null,
          script: null,
        },
      ];
    });
    startTransition(async () => {
      try {
        const definition = await getModuleDefinition({ schema, name, kind: moduleKind });
        setTabs((current) =>
          current.map((tab) =>
            tab.key === key
              ? {
                  ...tab,
                  schema: definition.schema,
                  name: definition.name,
                  loading: false,
                  script: {
                    schema: definition.schema,
                    name: definition.name,
                    kind: definition.kind,
                    definition: definition.definition,
                    unavailableReason: definition.unavailableReason,
                  },
                }
              : tab,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setTabs((current) =>
          current.map((tab) =>
            tab.key === key ? { ...tab, loading: false, error: message } : tab,
          ),
        );
      }
    });
  }

  function openReference(schema: string, name: string): void {
    if (focusExisting(schema, name)) {
      return;
    }
    const key = lookupKey(schema, name);
    setError(null);
    setActiveKey(key);
    setTabs((current) => {
      if (current.some((tab) => sameObject(tab, schema, name) || tab.key === key)) {
        return current;
      }
      return [
        ...current,
        {
          key,
          schema,
          name,
          kind: "lookup",
          loading: true,
          error: null,
          script: null,
        },
      ];
    });
    startTransition(async () => {
      try {
        const resolved = await resolveScriptObject({ schema, name });
        setTabs((current) => {
          if (!resolved) {
            return current.map((tab) =>
              tab.key === key
                ? {
                    ...tab,
                    loading: false,
                    error: `No script or table named ${schema}.${name}.`,
                  }
                : tab,
            );
          }
          const resolvedKey = scriptKey(resolved.kind, resolved.schema, resolved.name);
          const withoutLookup = current.filter((tab) => tab.key !== key);
          if (withoutLookup.some((tab) => tab.key === resolvedKey)) {
            return withoutLookup;
          }
          return [
            ...withoutLookup,
            {
              key: resolvedKey,
              schema: resolved.schema,
              name: resolved.name,
              kind: resolved.kind,
              loading: false,
              error: null,
              script: resolved,
            },
          ];
        });
        setActiveKey((current) => {
          if (current !== key) {
            return current;
          }
          return resolved
            ? scriptKey(resolved.kind, resolved.schema, resolved.name)
            : key;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setTabs((current) =>
          current.map((tab) =>
            tab.key === key ? { ...tab, loading: false, error: message } : tab,
          ),
        );
      }
    });
  }

  function reloadScript(tab: ScriptTab): void {
    setTabs((current) =>
      current.map((item) =>
        item.key === tab.key ? { ...item, loading: true, error: null } : item,
      ),
    );
    startTransition(async () => {
      try {
        const kind = tab.script?.kind ?? tab.kind;
        if (kind === "lookup" || kind === "table") {
          const resolved = await resolveScriptObject({
            schema: tab.schema,
            name: tab.name,
          });
          setTabs((current) =>
            current.map((item) => {
              if (item.key !== tab.key) {
                return item;
              }
              if (!resolved) {
                return {
                  ...item,
                  loading: false,
                  error: `No script or table named ${tab.schema}.${tab.name}.`,
                };
              }
              return {
                ...item,
                schema: resolved.schema,
                name: resolved.name,
                kind: resolved.kind,
                loading: false,
                error: null,
                script: resolved,
              };
            }),
          );
          return;
        }
        const definition = await getModuleDefinition({
          schema: tab.schema,
          name: tab.name,
          kind,
        });
        setTabs((current) =>
          current.map((item) =>
            item.key === tab.key
              ? {
                  ...item,
                  schema: definition.schema,
                  name: definition.name,
                  kind: definition.kind,
                  loading: false,
                  error: null,
                  script: {
                    schema: definition.schema,
                    name: definition.name,
                    kind: definition.kind,
                    definition: definition.definition,
                    unavailableReason: definition.unavailableReason,
                  },
                }
              : item,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setTabs((current) =>
          current.map((item) =>
            item.key === tab.key ? { ...item, loading: false, error: message } : item,
          ),
        );
      }
    });
  }

  function closeTab(key: string): void {
    const index = tabs.findIndex((tab) => tab.key === key);
    const next = tabs.filter((tab) => tab.key !== key);
    setTabs(next);
    if (activeKey === key) {
      setActiveKey(next[index]?.key ?? next[index - 1]?.key);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const root = rootRef.current;
      if (!root || root.offsetParent === null) {
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
      }
      if (event.key === "Tab") {
        if (tabs.length < 2) {
          return;
        }
        event.preventDefault();
        const index = tabs.findIndex((tab) => tab.key === activeKey);
        const current = index === -1 ? 0 : index;
        const delta = event.shiftKey ? -1 : 1;
        const next = tabs[(current + delta + tabs.length) % tabs.length];
        if (next) {
          setActiveKey(next.key);
        }
        return;
      }
      if (event.key.toLowerCase() === "w" && activeKey) {
        event.preventDefault();
        closeTab(activeKey);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeKey, tabs]);

  return (
    <div ref={rootRef}>
    <Space orientation="vertical" className="w-full" size="middle">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Typography.Text strong>Kind</Typography.Text>
          <div className="mt-1">
            <Segmented
              value={kind}
              onChange={(next) => {
                setKind(next as InspectorObjectKind);
                setSelected(undefined);
                setOptions([]);
                setQuery("");
              }}
              options={[
                { label: "Stored procedure", value: "storedProcedure" },
                { label: "Function", value: "function" },
                { label: "View", value: "view" },
                { label: "Table", value: "table" },
              ]}
            />
          </div>
        </div>
        <div className="min-w-[280px] flex-1">
          <Typography.Text strong>Name</Typography.Text>
          <SearchSelect
            filterOption={false}
            allowClear
            className="mt-1 w-full"
            classNames={{ popup: { listItem: "whitespace-nowrap" } }}
            placeholder="Words or a name, e.g. Bank Details"
            popupMatchSelectWidth={false}
            value={selected}
            searchValue={query}
            loading={loadingOptions}
            options={options.map((item) => ({
              value: `${item.schema}.${item.name}`,
              label: `${item.schema}.${item.name}`,
            }))}
            notFoundContent={
              query.trim().length < MIN_QUERY_LENGTH
                ? "Type at least 2 characters"
                : "No matches"
            }
            onSearch={setQuery}
            onChange={(next: string | undefined) => {
              setSelected(next);
              if (!next) {
                return;
              }
              const parsed = splitQualified(next);
              if (kind === "table") {
                openReference(parsed.schema, parsed.name);
                return;
              }
              openModule(parsed.schema, parsed.name, kind);
            }}
          />
        </div>
      </div>
      {error ? <Alert type="error" showIcon title={error} /> : null}
      {tabs.length > 0 ? (
        <Tabs
          activeKey={activeKey}
          hideAdd
          items={tabs.map((tab) => ({
            key: tab.key,
            label: (
              <span className="inline-flex items-center gap-1">
                {tab.kind === "lookup" ? null : (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: KIND_COLOR[tab.kind] }}
                  />
                )}
                {tab.name}
              </span>
            ),
            children: (
              <ScriptTabBody
                tab={tab}
                writesEnabled={writesEnabled}
                onOpenObject={(object) => {
                  openReference(object.schema, object.name);
                }}
                onRefresh={() => {
                  reloadScript(tab);
                }}
              />
            ),
          }))}
          type="editable-card"
          onChange={setActiveKey}
          onEdit={(targetKey, action) => {
            if (action === "remove" && typeof targetKey === "string") {
              closeTab(targetKey);
            }
          }}
        />
      ) : null}
    </Space>
    </div>
  );
}

function ScriptReload({ onRefresh }: { onRefresh: () => void }): React.JSX.Element {
  return (
    <div className="flex justify-end">
      <Tooltip title="Reload from database">
        <Button
          aria-label="Reload from database"
          icon={<ReloadOutlined />}
          size="small"
          type="text"
          onClick={onRefresh}
        />
      </Tooltip>
    </div>
  );
}

function ScriptTabBody({
  tab,
  writesEnabled,
  onOpenObject,
  onRefresh,
}: {
  tab: ScriptTab;
  writesEnabled: boolean;
  onOpenObject: (object: { schema: string; name: string }) => void;
  onRefresh: () => void;
}): React.JSX.Element {
  const [comparing, setComparing] = useState(false);
  if (tab.loading) {
    return <Typography.Text type="secondary">Loading {tab.schema}.{tab.name}…</Typography.Text>;
  }
  if (tab.error) {
    return <Alert type="error" showIcon title={tab.error} />;
  }
  if (comparing && tab.script) {
    return (
      <ScriptCompare
        kind={tab.script.kind}
        name={tab.script.name}
        schema={tab.script.schema}
        onClose={() => {
          setComparing(false);
        }}
      />
    );
  }
  if (tab.script?.kind === "table") {
    return (
      <div className="flex flex-col gap-2">
        <ScriptReload onRefresh={onRefresh} />
        <div className="flex items-center justify-between gap-2">
          <Typography.Text type="secondary">
            {tab.script.schema}.{tab.script.name} is a table. Columns:
          </Typography.Text>
          <Button
            size="small"
            onClick={() => {
              setComparing(true);
            }}
          >
            Compare
          </Button>
        </div>
        <pre className="max-h-[36rem] overflow-auto rounded bg-slate-50 p-3 font-mono text-xs leading-5 whitespace-pre dark:bg-slate-900">
          {tab.script.columns.map((column) => `${column.name}  ${column.typeName}`).join("\n")}
        </pre>
      </div>
    );
  }
  if (tab.script && "unavailableReason" in tab.script && tab.script.unavailableReason) {
    return (
      <div className="flex flex-col gap-2">
        <ScriptReload onRefresh={onRefresh} />
        <div>
          <Button
            size="small"
            onClick={() => {
              setComparing(true);
            }}
          >
            Compare
          </Button>
        </div>
        <Alert type="warning" showIcon title={tab.script.unavailableReason} />
      </div>
    );
  }
  if (tab.script && "definition" in tab.script && tab.script.definition) {
    return (
      <div className="flex flex-col gap-2">
        <ScriptReload onRefresh={onRefresh} />
        <ScriptBody
          name={tab.script.name}
          schema={tab.script.schema}
          sql={tab.script.definition}
          writesEnabled={writesEnabled}
          onCompare={() => {
            setComparing(true);
          }}
          onOpenObject={onOpenObject}
        />
      </div>
    );
  }
  return <Typography.Text type="secondary">No script text is available.</Typography.Text>;
}

function ScriptBody({
  schema,
  name,
  sql,
  writesEnabled,
  onOpenObject,
  onCompare,
}: {
  schema: string;
  name: string;
  sql: string;
  writesEnabled: boolean;
  onOpenObject: (object: { schema: string; name: string }) => void;
  onCompare: () => void;
}): React.JSX.Element {
  const [kinds, setKinds] = useState<Record<string, ScriptObjectKind>>({});
  const [kindsReady, setKindsReady] = useState(false);
  const [executeTarget, setExecuteTarget] = useState<UsedObject | null>(null);
  const [mode, setMode] = useState<"formatted" | "original">("formatted");
  const [jumpToken, setJumpToken] = useState<{ index: number; nonce: number } | null>(null);
  const formatted = useMemo(() => formatSql(sql), [sql]);
  const displaySql = mode === "formatted" ? formatted.sql : sql;
  const model = useMemo(() => bindSql(tokenizeSql(displaySql)), [displaySql]);
  const refs = useMemo(() => scriptObjectRefs(sql), [sql]);

  useEffect(() => {
    if (refs.length === 0) {
      setKinds({});
      setKindsReady(true);
      return;
    }
    let cancelled = false;
    setKindsReady(false);
    void resolveScriptObjectKinds(refs)
      .then((rows) => {
        if (cancelled) {
          return;
        }
        const next: Record<string, ScriptObjectKind> = {};
        for (const row of rows) {
          next[`${row.schema}.${row.name}`.toLowerCase()] = row.kind;
        }
        setKinds(next);
        setKindsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setKinds({});
          setKindsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refs]);

  return (
    <>
      <Splitter
        className="h-[36rem] overflow-hidden rounded border border-slate-200 dark:border-slate-700"
        collapsible={{ motion: true }}
      >
        <Splitter.Panel min="40%" style={{ overflow: "hidden" }}>
          <SqlScript
            jumpToken={jumpToken}
            kinds={kinds}
            mode={mode}
            model={model}
            warning={mode === "formatted" ? formatted.warning : null}
            onCompare={onCompare}
            onMode={setMode}
            onOpenObject={onOpenObject}
          />
        </Splitter.Panel>
        <Splitter.Panel
          collapsible={{ start: true, showCollapsibleIcon: true }}
          defaultSize={256}
          max="40%"
          min={192}
          style={{ overflow: "hidden" }}
        >
          <ScriptUsedObjects
            current={{ schema, name }}
            kinds={kinds}
            kindsReady={kindsReady}
            refs={refs}
            onExecute={setExecuteTarget}
            onJump={(symbol) => {
              setJumpToken({ index: symbol.declToken, nonce: Date.now() });
            }}
            onView={onOpenObject}
            symbols={model.symbols}
          />
        </Splitter.Panel>
      </Splitter>
      <ScriptExecuteModal
        object={executeTarget}
        writesEnabled={writesEnabled}
        onClose={() => {
          setExecuteTarget(null);
        }}
      />
    </>
  );
}
