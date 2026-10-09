import { REPO_IDS, type RepoId } from "./model.ts";

export const ROOTS_KEY = "backstage:flow-roots";
export const FLOW_ROOTS_SETTING = "flow-roots";

export type Roots = Partial<Record<RepoId, string>>;

export function readRoots(raw: unknown): Roots {
  if (raw == null || raw === "") return {};
  try {
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (!parsed || typeof parsed !== "object") return {};
    const roots: Roots = {};
    for (const repo of REPO_IDS) {
      const value = (parsed as Record<string, unknown>)[repo];
      if (typeof value === "string" && value.trim()) roots[repo] = value;
    }
    return roots;
  } catch {
    return {};
  }
}
