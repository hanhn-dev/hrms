import type { RepoId } from "./model.ts";

export type SourceCitation = {
  repo: RepoId;
  path: string;
  line: number;
  column: number;
};

const PREFIXES: { prefix: string; repo: RepoId; strip: boolean }[] = [
  { prefix: "HRMS-DATABASE/", repo: "hrms-db", strip: false },
  { prefix: "HRMS.Web/", repo: "sourcecode", strip: false },
  { prefix: "HRMS.CoreAPI/", repo: "sourcecode", strip: false },
  // The SDK checkout root is the package itself, so this prefix is not a folder inside it.
  { prefix: "hrms-sdk/", repo: "hrms-sdk", strip: true },
];

/** A repo-relative path, optionally `path:line` or `path:line:column`. */
export function parseSourceCitation(text: string): SourceCitation | null {
  const trimmed = text.trim().replace(/\\/g, "/");
  if (!trimmed || /\s/.test(trimmed) || trimmed.split("/").includes("..")) return null;

  let filePath = trimmed;
  let line = 1;
  let column = 1;
  const located = /^(.*):(\d+)(?::(\d+))?$/.exec(trimmed);
  if (located?.[1] && !located[1].endsWith(":")) {
    filePath = located[1];
    line = Number(located[2]);
    column = located[3] ? Number(located[3]) : 1;
  }

  if (!Number.isInteger(line) || line < 1 || !Number.isInteger(column) || column < 1) return null;
  const prefix = PREFIXES.find((item) => filePath.startsWith(item.prefix));
  if (!prefix) return null;
  const path = prefix.strip ? filePath.slice(prefix.prefix.length) : filePath;
  if (!path) return null;
  return { repo: prefix.repo, path, line, column };
}
