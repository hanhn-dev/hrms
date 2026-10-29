"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Alert, Segmented, Space, Tabs, Typography } from "antd";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import { SearchSelect } from "@/shared/ui";
import { ScriptTabBody, type ScriptTab } from "@/features/employer/inspector/script-tab-body";
import {
  getModuleDefinition,
  listInspectorTables,
  listModules,
  resolveScriptObject,
  type InspectorObjectKind,
  type ModuleKind,
} from "@/features/employer/inspector/queries";
import {
  forgetRecentObject,
  matchRecentObjects,
  mergeObjectOptions,
  readRecentObjects,
  recentObjectsStorageKey,
  recordRecentObject,
  type ObjectSearchOption,
  type RecentObject,
} from "@/features/employer/inspector/recent-objects";
import { getSetting, setSetting } from "@/shared/client-db/settings-db";

const MIN_QUERY_LENGTH = 2;

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

function objectSelectOptions(options: readonly ObjectSearchOption[]): Array<{
  label: string;
  options: Array<{ value: string; label: string }>;
}> {
  return (["recent", "catalog"] as const).flatMap((source) => {
    const items = options.filter((item) => item.source === source);
    if (items.length === 0) {
      return [];
    }
    return [
      {
        label: source === "recent" ? "Recent" : "Catalog",
        options: items.map((item) => ({
          value: `${item.schema}.${item.name}`,
          label: `${item.schema}.${item.name}`,
        })),
      },
    ];
  });
}

function sameObject(tab: ScriptTab, schema: string, name: string): boolean {
  return (
    tab.schema.toLowerCase() === schema.toLowerCase() &&
    tab.name.toLowerCase() === name.toLowerCase() &&
    tab.kind !== "lookup"
  );
}

export function ScriptPanel({
  environment,
  writesEnabled,
}: {
  environment: string;
  writesEnabled: boolean;
}): React.JSX.Element {
  const [kind, setKind] = useState<InspectorObjectKind>("storedProcedure");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const [recents, setRecents] = useState<RecentObject[]>([]);
  const [catalog, setCatalog] = useState<Array<{ schema: string; name: string }>>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const recentsRef = useRef<RecentObject[]>([]);
  const persistChain = useRef(Promise.resolve());
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [tabs, setTabs] = useState<ScriptTab[]>([]);
  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getSetting(recentObjectsStorageKey(environment))
      .then((raw) => {
        if (cancelled) {
          return;
        }
        const next = recentsRef.current.reduce(
          (rows, item) => recordRecentObject(rows, item, item.viewedAt),
          readRecentObjects(raw),
        );
        recentsRef.current = next;
        setRecents(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [environment]);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setLoadingOptions(false);
    } else {
      setLoadingOptions(true);
    }
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setCatalog([]);
      setCatalogQuery("");
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
          setCatalog(rows);
          setCatalogQuery(debouncedQuery);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCatalog([]);
          setCatalogQuery(debouncedQuery);
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

  function persistRecents(next: RecentObject[]): void {
    const key = recentObjectsStorageKey(environment);
    persistChain.current = persistChain.current
      .catch(() => undefined)
      .then(() => setSetting(key, next));
  }

  function rememberObject(object: {
    kind: InspectorObjectKind;
    schema: string;
    name: string;
  }): void {
    const next = recordRecentObject(recentsRef.current, object, new Date().toISOString());
    recentsRef.current = next;
    setRecents(next);
    persistRecents(next);
  }

  function forgetObject(target: {
    schema: string;
    name: string;
    kind?: InspectorObjectKind;
  }): void {
    const next = forgetRecentObject(recentsRef.current, target);
    recentsRef.current = next;
    setRecents(next);
    persistRecents(next);
  }

  const searchOptions = useMemo(() => {
    const catalogRows =
      catalogQuery === query.trim() && query.trim().length >= MIN_QUERY_LENGTH ? catalog : [];
    return mergeObjectOptions(matchRecentObjects(recents, kind, query), catalogRows);
  }, [catalog, catalogQuery, kind, query, recents]);

  function focusExisting(schema: string, name: string): boolean {
    const existing = tabs.find(
      (tab) => sameObject(tab, schema, name) || tab.key === lookupKey(schema, name),
    );
    if (!existing) {
      return false;
    }
    setActiveKey(existing.key);
    if (existing.kind !== "lookup") {
      rememberObject({ kind: existing.kind, schema: existing.schema, name: existing.name });
    }
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
        if (definition.unavailableReason?.startsWith("Unable to find")) {
          forgetObject({ kind: moduleKind, schema, name });
        } else {
          rememberObject({
            kind: definition.kind,
            schema: definition.schema,
            name: definition.name,
          });
        }
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
        if (resolved) {
          rememberObject({
            kind: resolved.kind,
            schema: resolved.schema,
            name: resolved.name,
          });
        } else {
          forgetObject({ schema, name });
        }
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
          if (resolved) {
            rememberObject({
              kind: resolved.kind,
              schema: resolved.schema,
              name: resolved.name,
            });
          } else {
            forgetObject({ schema: tab.schema, name: tab.name });
          }
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
        if (definition.unavailableReason?.startsWith("Unable to find")) {
          forgetObject({ kind, schema: tab.schema, name: tab.name });
        } else {
          rememberObject({
            kind: definition.kind,
            schema: definition.schema,
            name: definition.name,
          });
        }
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
            options={objectSelectOptions(searchOptions)}
            notFoundContent={
              query.trim().length < MIN_QUERY_LENGTH
                ? "No recent objects"
                : loadingOptions
                  ? null
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
