import { moduleNameSearchTokens } from "@hrms/db/module-name-search";

export const RECENT_OBJECT_LIMIT = 30;

export const RECENT_OBJECT_KINDS = [
  "storedProcedure",
  "function",
  "view",
  "table",
] as const;

export type RecentObjectKind = (typeof RECENT_OBJECT_KINDS)[number];

export type RecentObject = {
  kind: RecentObjectKind;
  schema: string;
  name: string;
  viewedAt: string;
};

export type NamedObject = {
  schema: string;
  name: string;
};

export type ObjectSearchOption = NamedObject & {
  source: "recent" | "catalog";
};

export function recentObjectsStorageKey(environment: string): string {
  return `inspector-recent-objects:${environment}`;
}

export function readRecentObjects(raw: unknown): RecentObject[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return capRecentObjects(
    raw
      .filter(isRecentObject)
      .sort((a, b) => b.viewedAt.localeCompare(a.viewedAt)),
  );
}

export function recordRecentObject(
  current: readonly RecentObject[],
  next: { kind: RecentObjectKind; schema: string; name: string },
  viewedAt: string,
): RecentObject[] {
  const schema = next.schema.trim();
  const name = next.name.trim();
  if (!schema || !name || !viewedAt.trim()) {
    return [...current];
  }
  const row: RecentObject = {
    kind: next.kind,
    schema,
    name,
    viewedAt,
  };
  const key = objectKey(row);
  return capRecentObjects([row, ...current.filter((item) => objectKey(item) !== key)]);
}

export function forgetRecentObject(
  current: readonly RecentObject[],
  target: { schema: string; name: string; kind?: RecentObjectKind },
): RecentObject[] {
  const schema = target.schema.trim().toLowerCase();
  const name = target.name.trim().toLowerCase();
  if (!schema || !name) {
    return [...current];
  }
  return current.filter((item) => {
    if (item.schema.toLowerCase() !== schema || item.name.toLowerCase() !== name) {
      return true;
    }
    return target.kind !== undefined && item.kind !== target.kind;
  });
}

export function matchRecentObjects(
  rows: readonly RecentObject[],
  kind: RecentObjectKind,
  query: string,
): RecentObject[] {
  const forKind = rows.filter((row) => row.kind === kind);
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return forKind;
  }
  const tokens = moduleNameSearchTokens(trimmed);
  if (tokens.length === 0) {
    return [];
  }
  return forKind.filter((row) => {
    const qualified = `${row.schema}.${row.name}`.toLowerCase();
    return tokens.every((token) => qualified.includes(token.toLowerCase()));
  });
}

export function mergeObjectOptions(
  recent: readonly NamedObject[],
  catalog: readonly NamedObject[],
): ObjectSearchOption[] {
  const seen = new Set<string>();
  const options: ObjectSearchOption[] = [];
  for (const row of recent) {
    const key = qualifiedKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    options.push({ schema: row.schema, name: row.name, source: "recent" });
  }
  for (const row of catalog) {
    const key = qualifiedKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    options.push({ schema: row.schema, name: row.name, source: "catalog" });
  }
  return options;
}

function capRecentObjects(rows: readonly RecentObject[]): RecentObject[] {
  const counts = new Map<RecentObjectKind, number>();
  const capped: RecentObject[] = [];
  for (const row of rows) {
    const count = counts.get(row.kind) ?? 0;
    if (count === RECENT_OBJECT_LIMIT) {
      continue;
    }
    counts.set(row.kind, count + 1);
    capped.push(row);
  }
  return capped;
}

function objectKey(row: { kind: RecentObjectKind; schema: string; name: string }): string {
  return `${row.kind}:${row.schema}.${row.name}`.toLowerCase();
}

function qualifiedKey(row: NamedObject): string {
  return `${row.schema}.${row.name}`.toLowerCase();
}

function isRecentObjectKind(value: unknown): value is RecentObjectKind {
  return (
    typeof value === "string" &&
    (RECENT_OBJECT_KINDS as readonly string[]).includes(value)
  );
}

function isRecentObject(value: unknown): value is RecentObject {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    isRecentObjectKind(row.kind) &&
    typeof row.schema === "string" &&
    row.schema.trim() !== "" &&
    typeof row.name === "string" &&
    row.name.trim() !== "" &&
    typeof row.viewedAt === "string" &&
    row.viewedAt.trim() !== ""
  );
}
