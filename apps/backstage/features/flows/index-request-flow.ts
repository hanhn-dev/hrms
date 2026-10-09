import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { API_ROOT, assembleFlowGraph } from "./assemble.ts";
import type { ProcedureFile, TextFile } from "./model.ts";
import { findRepoRoot, type RepoId } from "./paths.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(scriptDir, "..", "..", "content", "flows", "flow-graph.json");

const PROCEDURE_DIRS = new Set(["STOREPROCEDURE", "Stored Procedures", "STORED_PROCEDURE"]);

const entry = process.argv[1]?.replace(/\\/g, "/");
if (entry?.endsWith("index-request-flow.ts")) {
  writeGraph();
}

function writeGraph(): void {
  const dbRoot = requireRoot("hrms-db", "--db", "REQUEST_FLOW_HRMS_DB", ["D:/TDG HRMS DB"]);
  const sourceRoot = requireRoot("sourcecode", "--source", "REQUEST_FLOW_SOURCECODE", [
  "D:/TDG HRMS/SourceCode",
]);
const sdkRoot = requireRoot("hrms-sdk", "--sdk", "REQUEST_FLOW_HRMS_SDK", ["D:/hrms-sdk"]);

const procedures = loadProcedures(dbRoot);
const apiFiles = loadApiFiles(sourceRoot);
const sdkFiles = loadTextFiles(path.join(sdkRoot, "src"), sdkRoot, (file) => {
  return file.endsWith(".ts") && !file.includes(`${path.sep}examples${path.sep}`);
});
const screenRoot = path.join(sourceRoot, "HRMS.Web", "HRMS.Web", "HRM", "MyDetails_React", "src");
const screenFiles = loadTextFiles(screenRoot, sourceRoot, (file) => {
  return /\.(ts|tsx)$/.test(file) && !file.includes(".test.");
});

const graph = assembleFlowGraph({ procedures, apiFiles, sdkFiles, screenFiles });
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(graph));
console.log(`Wrote ${graph.nodes.length} nodes and ${graph.edges.length} edges to ${output}`);
console.log(graph.stats);
}

function requireRoot(repo: RepoId, flag: string, envName: string, candidates: readonly string[]): string {
  const fromArg = argument(flag);
  const fromEnv = process.env[envName];
  const starts = [fromArg, fromEnv, ...candidates].filter((value): value is string => Boolean(value));
  for (const start of starts) {
    const root = findRepoRoot(start, repo);
    if (root) return root;
  }
  throw new Error(`Pass ${flag} pointing at the ${repo} checkout.`);
}

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function loadProcedures(root: string): ProcedureFile[] {
  const databaseRoot = path.join(root, "HRMS-DATABASE");
  const files: ProcedureFile[] = [];
  for (const database of readdirSync(databaseRoot, { withFileTypes: true })) {
    if (!database.isDirectory()) continue;
    const databasePath = path.join(databaseRoot, database.name);
    for (const folder of readdirSync(databasePath, { withFileTypes: true })) {
      if (!folder.isDirectory() || !PROCEDURE_DIRS.has(folder.name)) continue;
      for (const file of walk(path.join(databasePath, folder.name))) {
        if (!file.endsWith(".sql")) continue;
        files.push({
          database: database.name,
          relativePath: relativePosix(root, file),
          source: readFileSync(file, "utf8"),
        });
      }
    }
  }
  return files;
}

function loadApiFiles(root: string): Map<string, string> {
  const api = path.join(root, ...API_ROOT.split("/"));
  const folders = [path.join(api, "Features", "Employee", "MyDetails"), path.join(api, "ORM")];
  const files = new Map<string, string>();
  for (const folder of folders) {
    if (!existsSync(folder)) continue;
    for (const file of walk(folder)) {
      if (!file.endsWith(".js")) continue;
      files.set(relativePosix(root, file), readFileSync(file, "utf8"));
    }
  }
  return files;
}

function loadTextFiles(directory: string, root: string, include: (file: string) => boolean): TextFile[] {
  if (!existsSync(directory)) return [];
  return walk(directory)
    .filter((file) => include(file))
    .map((file) => ({ relativePath: relativePosix(root, file), source: readFileSync(file, "utf8") }));
}

function walk(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else found.push(full);
  }
  return found;
}

function relativePosix(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}
