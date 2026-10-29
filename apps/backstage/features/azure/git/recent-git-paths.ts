import { displayGitPath } from "@/features/azure/git/git-text";

export const RECENT_GIT_PATH_LIMIT = 15;

const STORAGE_KEY = "backstage.git.recentPaths";

export type RecentGitPath = {
  readonly path: string;
  readonly historyBranch: string | null;
  readonly leftBranch: string | null;
  readonly rightBranch: string | null;
};

export type RecentGitPathUpdate = {
  readonly path: string;
  readonly historyBranch?: string | null;
  readonly leftBranch?: string | null;
  readonly rightBranch?: string | null;
};

export type RecentPathStorage = Pick<Storage, "getItem" | "setItem">;

const listeners = new Set<() => void>();

export function subscribeRecentGitPaths(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readRecentGitPaths(repositoryId: string, storage?: RecentPathStorage | null): RecentGitPath[] {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return [];
  }
  const store = readStore(resolved);
  return store[repositoryId] ?? [];
}

export function rememberRecentGitPath(
  repositoryId: string,
  update: RecentGitPathUpdate,
  storage?: RecentPathStorage | null,
): RecentGitPath[] {
  const resolved = resolveStorage(storage);
  const path = displayGitPath(update.path);
  const current = readRecentGitPaths(repositoryId, resolved);
  if (!resolved || repositoryId.trim().length === 0 || path.length === 0) {
    return current;
  }

  const existing = current.find((item) => item.path === path);
  const next: RecentGitPath = {
    path,
    historyBranch: branchValue(update.historyBranch, existing?.historyBranch ?? null),
    leftBranch: branchValue(update.leftBranch, existing?.leftBranch ?? null),
    rightBranch: branchValue(update.rightBranch, existing?.rightBranch ?? null),
  };
  const saved = [next, ...current.filter((item) => item.path !== path)].slice(0, RECENT_GIT_PATH_LIMIT);
  const store = readStore(resolved);
  store[repositoryId] = saved;
  try {
    resolved.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    return current;
  }
  for (const listener of listeners) {
    listener();
  }
  return saved;
}

function resolveStorage(storage?: RecentPathStorage | null): RecentPathStorage | null {
  if (storage) {
    return storage;
  }
  if (storage === null) {
    return null;
  }
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function branchValue(update: string | null | undefined, previous: string | null): string | null {
  if (update === undefined) {
    return previous;
  }
  const trimmed = update?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function readStore(storage: RecentPathStorage): Record<string, RecentGitPath[]> {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null || raw.trim().length === 0) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const store: Record<string, RecentGitPath[]> = {};
    for (const [repositoryId, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) {
        continue;
      }
      const entries = value.map(readEntry).filter((entry): entry is RecentGitPath => entry !== null);
      if (entries.length > 0) {
        store[repositoryId] = entries.slice(0, RECENT_GIT_PATH_LIMIT);
      }
    }
    return store;
  } catch {
    return {};
  }
}

function readEntry(value: unknown): RecentGitPath | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const entry = value as Record<string, unknown>;
  if (typeof entry.path !== "string") {
    return null;
  }
  const path = displayGitPath(entry.path);
  if (path.length === 0) {
    return null;
  }
  const historyBranch = readBranch(entry.historyBranch);
  const leftBranch = readBranch(entry.leftBranch);
  const rightBranch = readBranch(entry.rightBranch);
  if (historyBranch === undefined || leftBranch === undefined || rightBranch === undefined) {
    return null;
  }
  return { path, historyBranch, leftBranch, rightBranch };
}

function readBranch(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
