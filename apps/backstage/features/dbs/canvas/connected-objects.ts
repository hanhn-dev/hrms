import type {
  DatabaseObjectDetails,
  DatabaseObjectKind,
} from "@/features/dbs/queries";

export const MAX_EXPAND_PIN_BATCH = 50;

export type ConnectedObjectRef = {
  id: string;
  schema: string;
  name: string;
  kind: DatabaseObjectKind;
};

export type ConnectedObjectsSplit = {
  fkNeighbors: ConnectedObjectRef[];
  allShallow: ConnectedObjectRef[];
};

export function parseObjectId(objectId: string): { schema: string; name: string } {
  const dot = objectId.indexOf(".");
  if (dot === -1) {
    return { schema: "dbo", name: objectId };
  }
  return {
    schema: objectId.slice(0, dot),
    name: objectId.slice(dot + 1),
  };
}

function resolveRef(
  relatedId: string,
  kindById: Map<string, DatabaseObjectKind>,
  pinned: ReadonlyArray<ConnectedObjectRef>,
): ConnectedObjectRef {
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
    kind: kindById.get(relatedId) ?? "table",
  };
}

/**
 * Shallow (1-hop) connections: FK endpoints vs the full union with
 * dependencies / dependents.
 */
export function buildConnectedObjects(
  objectId: string,
  details: DatabaseObjectDetails | undefined,
  pinned: ReadonlyArray<ConnectedObjectRef>,
): ConnectedObjectsSplit {
  if (!details) {
    return { fkNeighbors: [], allShallow: [] };
  }

  const kindById = new Map<string, DatabaseObjectKind>();
  for (const item of pinned) {
    kindById.set(item.id, item.kind);
  }

  const fkIds = new Set<string>();
  for (const rel of details.relationships) {
    if (rel.from.objectId !== objectId) {
      fkIds.add(rel.from.objectId);
    }
    if (rel.to.objectId !== objectId) {
      fkIds.add(rel.to.objectId);
    }
  }

  const allIds = new Set<string>(fkIds);
  for (const dep of details.dependencies) {
    allIds.add(dep.objectId);
    if (dep.kind) {
      kindById.set(dep.objectId, dep.kind);
    }
  }
  for (const dep of details.dependents) {
    allIds.add(dep.objectId);
    if (dep.kind) {
      kindById.set(dep.objectId, dep.kind);
    }
  }

  const fkNeighbors = [...fkIds].map((id) => resolveRef(id, kindById, pinned));
  const allShallow = [...allIds].map((id) => resolveRef(id, kindById, pinned));

  return { fkNeighbors, allShallow };
}

/** Disabled only after a deps load proves there is nothing to expand. */
export function isExpandConnectionsDisabled(
  connectionsLoaded: boolean,
  connectedCount: number,
  expanding: boolean,
): boolean {
  if (expanding) {
    return true;
  }
  return connectionsLoaded && connectedCount === 0;
}

/**
 * Cap how many ids can be pinned in one expand. Preserves input order.
 */
export function clampSelectionForPin(
  selectedIds: readonly string[],
  cap: number = MAX_EXPAND_PIN_BATCH,
): string[] {
  if (cap <= 0) {
    return [];
  }
  return selectedIds.slice(0, cap);
}

export function filterConnectedObjects(
  objects: readonly ConnectedObjectRef[],
  query: string,
  kind: DatabaseObjectKind | "all",
): ConnectedObjectRef[] {
  const normalized = query.trim().toLowerCase();
  return objects.filter((object) => {
    if (kind !== "all" && object.kind !== kind) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    return (
      object.name.toLowerCase().includes(normalized) ||
      object.schema.toLowerCase().includes(normalized) ||
      `${object.schema}.${object.name}`.toLowerCase().includes(normalized)
    );
  });
}
