import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { REPO_IDS, type RepoId, type SourceRef } from "./model.ts";

export { REPO_IDS, type RepoId };

const WALK_LIMIT = 12;

export function repoMarkerMatches(directory: string, repo: RepoId): boolean {
  if (repo === "hrms-db") return existsSync(path.join(directory, "HRMS-DATABASE"));
  if (repo === "sourcecode") {
    return existsSync(
      path.join(directory, "HRMS.CoreAPI", "HRMS.Core.WebAPI.Node", "package.json"),
    );
  }
  const packagePath = path.join(directory, "package.json");
  if (!existsSync(packagePath)) return false;
  try {
    const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as { name?: string };
    return parsed.name === "@hrms/sdk";
  } catch {
    return false;
  }
}

export function findRepoRoot(start: string, repo: RepoId): string | null {
  if (!start.trim()) return null;
  let current = path.resolve(start);
  if (existsSync(current) && !statSync(current).isDirectory()) current = path.dirname(current);
  for (let step = 0; step < WALK_LIMIT; step += 1) {
    if (existsSync(current) && repoMarkerMatches(current, repo)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}

export function cursorFileUrl(absolutePath: string, line: number, column: number): string {
  return editorFileUrl(absolutePath, line, column, "cursor");
}

export type EditorId = "cursor" | "vscode";

export function editorFileUrl(
  absolutePath: string,
  line: number,
  column: number,
  editor: EditorId,
): string {
  const posix = absolutePath.replace(/\\/g, "/");
  const encoded = posix
    .split("/")
    .map((segment) => (/^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join("/");
  const protocol = editor === "vscode" ? "vscode" : "cursor";
  return `${protocol}://file/${encoded}:${line}:${column}`;
}

export function resolveInsideRepo(root: string, relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized || normalized.split("/").includes("..")) return null;
  const absolute = path.resolve(root, ...normalized.split("/"));
  const rootResolved = path.resolve(root);
  const fromRoot = path.relative(rootResolved, absolute);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) return null;
  if (!existsSync(absolute)) return null;
  return absolute;
}

export function cursorUrlFor(root: string, source: SourceRef, editor: EditorId = "cursor"): string | null {
  const absolute = resolveInsideRepo(root, source.path);
  if (!absolute) return null;
  return editorFileUrl(absolute, source.line, source.column, editor);
}

const MAX_SCRIPT_BYTES = 2_000_000;

export function readRepoFile(root: string, relativePath: string): string | null {
  const absolute = resolveInsideRepo(root, relativePath);
  if (!absolute) return null;
  const stat = statSync(absolute);
  if (!stat.isFile() || stat.size > MAX_SCRIPT_BYTES) return null;
  return decodeSqlFile(readFileSync(absolute));
}

function decodeSqlFile(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.alloc(buffer.length - 2);
    for (let index = 2; index < buffer.length - 1; index += 2) {
      swapped[index - 2] = buffer[index + 1] ?? 0;
      swapped[index - 1] = buffer[index] ?? 0;
    }
    return swapped.toString("utf16le");
  }
  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

export function isRepoId(value: string): value is RepoId {
  return (REPO_IDS as readonly string[]).includes(value);
}
