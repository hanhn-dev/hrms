"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Button,
  Dropdown,
  Input,
  Segmented,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ApartmentOutlined,
  DiffOutlined,
  LoadingOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  fetchCatalog,
  type DatabaseObjectKind,
  type DatabaseObjectDetails,
} from "@/features/dbs/queries";
import { ObjectPeek, type PeekLoadedParts } from "@/features/dbs/peek/object-peek";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import { HighlightMatch } from "@/shared/ui";
import { SqlRunnerPanel } from "@/features/dbs/sql-runner/sql-runner-panel";
import { ComparePanel } from "@/features/dbs/compare/compare-panel";
import { ValueSearchPanel } from "@/features/dbs/value-search/value-search-panel";
import {
  SchemaNode,
  type SchemaNodeData,
} from "@/features/dbs/canvas/schema-node";

const KIND_OPTIONS: { label: string; value: DatabaseObjectKind | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Tables", value: "table" },
  { label: "Views", value: "view" },
  { label: "Procedures", value: "storedProcedure" },
  { label: "Functions", value: "function" },
];

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_RESULT_LIMIT = 40;
const NODE_WIDTH = 288;
/** Collapsed SchemaNode card height — keeps RF nodes visible before measure. */
const NODE_COLLAPSED_HEIGHT = 96;
const NODE_GAP_X = 72;
const NODE_GAP_Y = 48;
const ALL_KINDS: DatabaseObjectKind[] = [
  "table",
  "view",
  "storedProcedure",
  "function",
];

const nodeTypes = {
  schema: SchemaNode,
} satisfies NodeTypes;

type SearchHit = {
  id: string;
  schema: string;
  name: string;
  kind: DatabaseObjectKind;
};

type CanvasObject = SearchHit & {
  position: { x: number; y: number };
  collapsed: boolean;
};

type OverlayMode = "none" | "sql" | "compare" | "value-search";

function canvasObjectId(schema: string, name: string): string {
  return `${schema}.${name}`;
}

function mergeObjectDetails(
  existing: DatabaseObjectDetails | undefined,
  incoming: DatabaseObjectDetails,
): DatabaseObjectDetails {
  if (!existing) {
    return incoming;
  }
  return {
    object: incoming.object.definitionAvailable
      ? incoming.object
      : {
          ...existing.object,
          definitionAvailable:
            existing.object.definitionAvailable ||
            incoming.object.definitionAvailable,
        },
    columns:
      incoming.columns.length > 0 ? incoming.columns : existing.columns,
    parameters:
      incoming.parameters.length > 0 ? incoming.parameters : existing.parameters,
    definition: incoming.definition ?? existing.definition,
    definitionUnavailableReason:
      incoming.definitionUnavailableReason ??
      existing.definitionUnavailableReason,
    dependencies:
      incoming.dependencies.length > 0
        ? incoming.dependencies
        : existing.dependencies,
    dependents:
      incoming.dependents.length > 0
        ? incoming.dependents
        : existing.dependents,
    relationships:
      incoming.relationships.length > 0
        ? incoming.relationships
        : existing.relationships,
    indexes:
      (incoming.indexes ?? []).length > 0
        ? incoming.indexes
        : (existing.indexes ?? []),
    triggers:
      (incoming.triggers ?? []).length > 0
        ? incoming.triggers
        : (existing.triggers ?? []),
    constraints:
      (incoming.constraints ?? []).length > 0
        ? incoming.constraints
        : (existing.constraints ?? []),
    warnings:
      incoming.warnings.length > 0 ? incoming.warnings : existing.warnings,
  };
}

function FitViewOnFirstPin({ nodeCount }: { nodeCount: number }): null {
  const { fitView } = useReactFlow();
  const didFitRef = useRef(false);

  useEffect(() => {
    if (nodeCount === 0) {
      didFitRef.current = false;
      return;
    }
    if (didFitRef.current) {
      return;
    }
    didFitRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 200 });
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [fitView, nodeCount]);

  return null;
}

function parseObjectId(objectId: string): { schema: string; name: string } {
  const dot = objectId.indexOf(".");
  if (dot === -1) {
    return { schema: "dbo", name: objectId };
  }
  return {
    schema: objectId.slice(0, dot),
    name: objectId.slice(dot + 1),
  };
}

function nextPinPosition(
  pinned: CanvasObject[],
): { x: number; y: number } {
  const index = pinned.length;
  return {
    x: (index % 3) * (NODE_WIDTH + NODE_GAP_X) + 40,
    y: Math.floor(index / 3) * (140 + NODE_GAP_Y) + 40,
  };
}

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

function parseSearchTokens(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function rankSearchHits(objects: SearchHit[], q: string): SearchHit[] {
  const tokens = parseSearchTokens(q);
  if (tokens.length === 0) {
    return [];
  }
  const significant = tokens.some((token) => token.length >= 2);
  if (!significant && tokens.join("").length < 2) {
    return [];
  }

  const joined = tokens.join("");

  return objects
    .map((obj) => {
      const name = obj.name.toLowerCase();
      const schema = obj.schema.toLowerCase();
      const qualified = `${schema}.${name}`;
      if (!tokens.every((token) => qualified.includes(token))) {
        return null;
      }
      const score =
        name === joined
          ? 4
          : name.startsWith(joined)
            ? 3
            : name.startsWith(tokens[0]!)
              ? 2
              : qualified.startsWith(tokens[0]!)
                ? 1
                : 0;
      return { obj, score, name };
    })
    .filter(
      (entry): entry is { obj: SearchHit; score: number; name: string } =>
        entry !== null,
    )
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, SEARCH_RESULT_LIMIT)
    .map((entry) => entry.obj);
}

export function DbsStudio({
  employerId,
  writesEnabled,
}: {
  employerId: number | null;
  writesEnabled: boolean;
}): React.JSX.Element {
  const [kindFilter, setKindFilter] = useState<DatabaseObjectKind | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchHighlightIndex, setSearchHighlightIndex] = useState(0);
  const [searchMenuDismissed, setSearchMenuDismissed] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const catalogCacheRef = useRef<Partial<Record<string, SearchHit[]>>>({});
  const catalogRequestRef = useRef(0);
  const [pinned, setPinned] = useState<CanvasObject[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayMode>("none");
  const [detailsCache, setDetailsCache] = useState<
    Record<string, DatabaseObjectDetails>
  >({});
  const [loadedParts, setLoadedParts] = useState<
    Record<string, PeekLoadedParts>
  >({});

  const kindsKey = kindFilter === "all" ? "all" : kindFilter;
  const searchTokens = useMemo(
    () => parseSearchTokens(debouncedSearch),
    [debouncedSearch],
  );
  const liveSearchTokens = useMemo(() => parseSearchTokens(search), [search]);
  const isSearchableTokens = (tokens: string[]): boolean =>
    tokens.length > 0 &&
    (tokens.some((token) => token.length >= 2) ||
      tokens.join("").length >= 2);
  const hasSearchableQuery = isSearchableTokens(searchTokens);
  const hasLiveSearchableQuery = isSearchableTokens(liveSearchTokens);
  const pendingDebounce =
    hasLiveSearchableQuery && search.trim() !== debouncedSearch.trim();
  const searchBusy = pendingDebounce || catalogLoading;

  useEffect(() => {
    const q = debouncedSearch.trim();
    const tokens = parseSearchTokens(q);
    const searchable =
      tokens.length > 0 &&
      (tokens.some((token) => token.length >= 2) ||
        tokens.join("").length >= 2);

    if (!searchable) {
      setSearchHits([]);
      setCatalogLoading(false);
      return;
    }

    const cached = catalogCacheRef.current[kindsKey];
    if (cached) {
      setSearchHits(rankSearchHits(cached, q));
      setCatalogLoading(false);
      return;
    }

    const requestId = ++catalogRequestRef.current;
    let cancelled = false;
    setCatalogLoading(true);
    setSearchHits([]);

    void fetchCatalog({
      kinds: kindFilter === "all" ? ALL_KINDS : [kindFilter],
      includeRelationships: false,
    })
      .then((catalog) => {
        if (cancelled || requestId !== catalogRequestRef.current) {
          return;
        }
        const objects = catalog.objects.map((obj) => ({
          id: obj.id || canvasObjectId(obj.schema, obj.name),
          schema: obj.schema,
          name: obj.name,
          kind: obj.kind,
        }));
        catalogCacheRef.current[kindsKey] = objects;
        setSearchHits(rankSearchHits(objects, q));
      })
      .catch(() => {
        if (!cancelled && requestId === catalogRequestRef.current) {
          setSearchHits([]);
        }
      })
      .finally(() => {
        if (!cancelled && requestId === catalogRequestRef.current) {
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, kindFilter, kindsKey]);

  useEffect(() => {
    setSearchHighlightIndex(0);
  }, [searchHits]);

  useEffect(() => {
    if (searchHits.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          ".ant-dropdown-menu-item.dbs-search-highlight",
        )
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [searchHighlightIndex, searchHits]);

  const applyDetails = useCallback(
    (objectId: string, details: DatabaseObjectDetails) => {
      setDetailsCache((current) => ({
        ...current,
        [objectId]: mergeObjectDetails(current[objectId], details),
      }));
      if (details.relationships.length === 0) {
        return;
      }
      setEdges((current) => {
        const next = [...current];
        for (const rel of details.relationships) {
          const edgeId = rel.id;
          if (next.some((e) => e.id === edgeId)) {
            continue;
          }
          next.push({
            id: edgeId,
            source: rel.from.objectId,
            target: rel.to.objectId,
            label: rel.label,
            className: "database-edge",
            animated: true,
            style: {
              stroke: "#0891b2",
              strokeWidth: 2,
              strokeDasharray: "7 5",
            },
          });
        }
        return next;
      });
    },
    [],
  );

  const pinObject = useCallback(
    (obj: Pick<CanvasObject, "schema" | "name" | "kind"> & { id?: string }) => {
      const id = obj.id ?? canvasObjectId(obj.schema, obj.name);
      setPinned((current) => {
        if (current.some((item) => item.id === id)) {
          return current;
        }
        return [
          ...current,
          {
            id,
            schema: obj.schema,
            name: obj.name,
            kind: obj.kind,
            position: nextPinPosition(current),
            collapsed: true,
          },
        ];
      });
    },
    [],
  );

  const removeObject = useCallback((objectId: string) => {
    setPinned((current) => current.filter((item) => item.id !== objectId));
    setDetailsCache((current) => {
      const next = { ...current };
      delete next[objectId];
      return next;
    });
    setLoadedParts((current) => {
      const next = { ...current };
      delete next[objectId];
      return next;
    });
    setEdges((current) =>
      current.filter(
        (edge) => edge.source !== objectId && edge.target !== objectId,
      ),
    );
    setSelectedId((current) => (current === objectId ? null : current));
    setPeekId((current) => (current === objectId ? null : current));
  }, []);

  const toggleCollapse = useCallback((objectId: string) => {
    setPinned((current) =>
      current.map((item) =>
        item.id === objectId
          ? { ...item, collapsed: !item.collapsed }
          : item,
      ),
    );
  }, []);

  const expandSelected = useCallback(
    (objectId: string, selectedIds: string[]) => {
      const details = detailsCache[objectId];
      const kindById = new Map<string, DatabaseObjectKind>();
      for (const item of pinned) {
        kindById.set(item.id, item.kind);
      }
      for (const relatedId of selectedIds) {
        if (relatedId === objectId) {
          continue;
        }
        const parsed = parseObjectId(relatedId);
        pinObject({
          id: relatedId,
          schema: parsed.schema,
          name: parsed.name,
          kind: kindById.get(relatedId) ?? "table",
        });
      }
      if (details) {
        setEdges((current) => {
          const next = [...current];
          for (const rel of details.relationships) {
            if (
              !selectedIds.includes(rel.from.objectId) &&
              !selectedIds.includes(rel.to.objectId)
            ) {
              continue;
            }
            if (next.some((e) => e.id === rel.id)) {
              continue;
            }
            next.push({
              id: rel.id,
              source: rel.from.objectId,
              target: rel.to.objectId,
              label: rel.label,
              className: "database-edge",
              animated: true,
              style: {
                stroke: "#0891b2",
                strokeWidth: 2,
                strokeDasharray: "7 5",
              },
            });
          }
          return next;
        });
      }
    },
    [detailsCache, pinObject, pinned],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Dimension/select-only updates must not rewrite pinned — recreating RF
    // nodes without measured size would leave cards at visibility:hidden.
    const affectsPinned = changes.some(
      (change) => change.type === "position" || change.type === "remove",
    );
    if (!affectsPinned) {
      return;
    }
    setPinned((current) => {
      const asNodes: Node[] = current.map((item) => ({
        id: item.id,
        position: item.position,
        data: {},
        type: "schema",
      }));
      const nextNodes = applyNodeChanges(changes, asNodes);
      const byId = new Map(nextNodes.map((node) => [node.id, node]));
      return current
        .map((item) => {
          const node = byId.get(item.id);
          if (!node) {
            return item;
          }
          return {
            ...item,
            position: node.position,
          };
        })
        .filter((item) => byId.has(item.id));
    });
  }, []);

  const nodes: Node<SchemaNodeData>[] = useMemo(
    () =>
      pinned.map((obj) => {
        const details = detailsCache[obj.id];
        const connectedIds = new Set<string>();
        if (details) {
          for (const rel of details.relationships) {
            if (rel.from.objectId !== obj.id) {
              connectedIds.add(rel.from.objectId);
            }
            if (rel.to.objectId !== obj.id) {
              connectedIds.add(rel.to.objectId);
            }
          }
          for (const dep of details.dependencies) {
            connectedIds.add(dep.objectId);
          }
          for (const dep of details.dependents) {
            connectedIds.add(dep.objectId);
          }
        }
        const connectedObjects = [...connectedIds].map((relatedId) => {
          const existing = pinned.find((item) => item.id === relatedId);
          if (existing) {
            return {
              id: existing.id,
              schema: existing.schema,
              name: existing.name,
              kind: existing.kind,
            };
          }
          const parsed = parseObjectId(relatedId);
          return {
            id: relatedId,
            schema: parsed.schema,
            name: parsed.name,
            kind: "table" as DatabaseObjectKind,
          };
        });

        return {
          id: obj.id,
          type: "schema",
          position: obj.position,
          initialWidth: NODE_WIDTH,
          initialHeight: NODE_COLLAPSED_HEIGHT,
          selected: selectedId === obj.id,
          data: {
            object: {
              id: obj.id,
              schema: obj.schema,
              name: obj.name,
              kind: obj.kind,
            },
            columns:
              obj.kind === "table" || obj.kind === "view"
                ? details?.columns
                : undefined,
            dependencyCount:
              (details?.dependencies.length ?? 0) +
              (details?.dependents.length ?? 0),
            collapsed: obj.collapsed,
            active: selectedId === obj.id,
            connectedObjects,
            onPeek: (objectId) => {
              setSelectedId(objectId);
              setPeekId(objectId);
            },
            onExpandSelected: expandSelected,
            onToggleCollapse: toggleCollapse,
            onRemove: removeObject,
          },
        };
      }),
    [
      pinned,
      detailsCache,
      selectedId,
      expandSelected,
      toggleCollapse,
      removeObject,
    ],
  );

  const visibleEdges = useMemo(() => {
    const ids = new Set(pinned.map((p) => p.id));
    const positions = new Map(
      pinned.map((item) => [item.id, item.position] as const),
    );
    return edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((edge) => {
        const sourcePos = positions.get(edge.source);
        const targetPos = positions.get(edge.target);
        const exitRight =
          !sourcePos || !targetPos || sourcePos.x <= targetPos.x;
        return {
          ...edge,
          sourceHandle: exitRight ? "source-right" : "source-left",
          targetHandle: exitRight ? "target-left" : "target-right",
        };
      });
  }, [edges, pinned]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId(node.id);
  }, []);

  const peekObject = pinned.find((p) => p.id === peekId) ?? null;
  const handlePeekDetails = useCallback(
    (details: DatabaseObjectDetails) => {
      if (!peekId) {
        return;
      }
      applyDetails(peekId, details);
    },
    [applyDetails, peekId],
  );

  const handlePartLoaded = useCallback(
    (part: keyof PeekLoadedParts) => {
      if (!peekId) {
        return;
      }
      setLoadedParts((current) => ({
        ...current,
        [peekId]: {
          ...current[peekId],
          [part]: true,
        },
      }));
    },
    [peekId],
  );

  const searchOpen =
    !searchMenuDismissed &&
    (hasSearchableQuery || hasLiveSearchableQuery) &&
    (searchBusy || searchHits.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <Segmented
          value={kindFilter}
          options={KIND_OPTIONS}
          onChange={(value) => {
            setKindFilter(value as DatabaseObjectKind | "all");
          }}
        />
        <Dropdown
          trigger={["click"]}
          menu={{
            activeKey:
              searchHits[searchHighlightIndex]?.id ?? undefined,
            items: searchHits.map((hit, index) => ({
              key: hit.id,
              label: (
                <Space>
                  <Tag color={KIND_COLOR[hit.kind] ?? "default"}>{hit.kind}</Tag>
                  <span>
                    <HighlightMatch
                      query={search}
                      text={`${hit.schema}.${hit.name}`}
                    />
                  </span>
                </Space>
              ),
              onClick: () => {
                pinObject(hit);
              },
              className:
                index === searchHighlightIndex
                  ? "dbs-search-highlight ant-dropdown-menu-item-active"
                  : undefined,
            })),
          }}
          open={searchOpen}
          onOpenChange={(open, info) => {
            // Keep the panel open after pinning via menu click / Enter.
            if (!open && info.source === "menu") {
              return;
            }
            setSearchMenuDismissed(!open);
          }}
        >
          <Input
            allowClear
            className="w-80"
            prefix={
              searchBusy ? <LoadingOutlined spin /> : <SearchOutlined />
            }
            placeholder="Search objects (e.g. TEmployee or T oyee)"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSearchMenuDismissed(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                if (searchOpen || search.length > 0) {
                  event.preventDefault();
                  setSearchMenuDismissed(true);
                  setSearch("");
                  setSearchHits([]);
                }
                return;
              }
              if (!searchOpen || searchHits.length === 0) {
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSearchHighlightIndex((current) =>
                  Math.min(current + 1, searchHits.length - 1),
                );
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSearchHighlightIndex((current) => Math.max(current - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const hit =
                  searchHits[searchHighlightIndex] ?? searchHits[0];
                if (hit) {
                  pinObject(hit);
                }
              }
            }}
            aria-busy={searchBusy}
          />
        </Dropdown>
        <Button
          icon={<SearchOutlined />}
          onClick={() => {
            setOverlay("value-search");
          }}
        >
          Value search
        </Button>
        <Button
          onClick={() => {
            setOverlay("sql");
          }}
        >
          Run SQL
        </Button>
        <Button
          icon={<DiffOutlined />}
          onClick={() => {
            setOverlay("compare");
          }}
        >
          Compare envs
        </Button>
        {pinned.length > 0 ? (
          <Button
            type="link"
            onClick={() => {
              setPinned([]);
              setEdges([]);
              setDetailsCache({});
              setLoadedParts({});
              setSelectedId(null);
              setPeekId(null);
            }}
          >
            Clear canvas
          </Button>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={visibleEdges}
            nodeTypes={nodeTypes}
            minZoom={0.25}
            maxZoom={1.6}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={(_event, node) => {
              setSelectedId(node.id);
              setPeekId(node.id);
            }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{
              className: "database-edge",
              style: {
                stroke: "#0891b2",
                strokeWidth: 2,
                strokeDasharray: "7 5",
              },
            }}
          >
            <FitViewOnFirstPin nodeCount={pinned.length} />
            <Background
              color="#cbd5e1"
              gap={32}
              size={1}
              variant={BackgroundVariant.Dots}
              bgColor="#f8fafc"
            />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </ReactFlowProvider>

        {pinned.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-white/90 px-6 py-4 text-center shadow-sm ring-1 ring-slate-200">
              <ApartmentOutlined className="mb-2 text-2xl text-slate-400" />
              <Typography.Title level={5} className="!mb-1">
                Pin database objects
              </Typography.Title>
              <Typography.Text type="secondary">
                Search tables, views, procedures, or functions and open them on
                the canvas.
              </Typography.Text>
            </div>
          </div>
        ) : null}

        {peekObject ? (
          <ObjectPeek
            object={{
              id: peekObject.id,
              schema: peekObject.schema,
              name: peekObject.name,
              kind: peekObject.kind,
            }}
            details={detailsCache[peekObject.id] ?? null}
            loadedParts={loadedParts[peekObject.id]}
            employerId={employerId}
            writesEnabled={writesEnabled}
            onClose={() => {
              setPeekId(null);
            }}
            onDetails={handlePeekDetails}
            onPartLoaded={handlePartLoaded}
            onExpandRelated={(related) => {
              pinObject(related);
            }}
          />
        ) : null}

        {overlay === "sql" ? (
          <SqlRunnerPanel
            onClose={() => {
              setOverlay("none");
            }}
          />
        ) : null}
        {overlay === "compare" ? (
          <ComparePanel
            onClose={() => {
              setOverlay("none");
            }}
          />
        ) : null}
        {overlay === "value-search" ? (
          <ValueSearchPanel
            employerId={employerId}
            onClose={() => {
              setOverlay("none");
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
