import type { ProcedureFile } from "./model.ts";
import { calledNames, extractFunction, parseRequires, sectionKeyIn } from "./routes.ts";
import { extractExecCalls, type ExecCall } from "./source-text.ts";

export type HandlerExec = ExecCall & {
  relativePath: string;
  sectionKey: string | null;
};

const TRACE_LIMIT = 4;

export function collectHandlerExecs(input: {
  files: ReadonlyMap<string, string>;
  apiRoot: string;
  controllerPath: string;
  handlerName: string;
}): HandlerExec[] {
  const found: HandlerExec[] = [];
  const seen = new Set<string>();

  const visit = (file: string, functionName: string, sectionKey: string | null, depth: number): void => {
    const visitKey = `${file}::${functionName}::${sectionKey ?? ""}`;
    if (seen.has(visitKey) || depth > TRACE_LIMIT) return;
    seen.add(visitKey);
    const source = input.files.get(file);
    if (!source) return;
    const region = extractFunction(source, functionName);
    if (!region) return;
    const scoped = sectionKey ?? sectionKeyIn(region.body);
    for (const exec of extractExecCalls(source)) {
      if (exec.index < region.start || exec.index > region.end) continue;
      found.push({ ...exec, relativePath: file, sectionKey: scoped });
    }
    const bindings = [...parseRequires(source), ...parseRequires(region.body)];
    const byName = new Map(bindings.map((binding) => [binding.localName, binding]));
    for (const name of calledNames(region.body)) {
      const binding = byName.get(name);
      if (!binding) continue;
      const nextFile = resolveRequire(file, binding.spec, input.apiRoot);
      if (!nextFile || !input.files.has(nextFile)) continue;
      const callSection = sectionKeyAtCall(region.body, name) ?? scoped;
      visit(nextFile, name, callSection, depth + 1);
    }
  };

  visit(input.controllerPath, input.handlerName, null, 0);
  return dedupeExecs(found);
}

export function resolveRequire(fromRelative: string, spec: string, apiRoot: string): string | null {
  const posix = fromRelative.replace(/\\/g, "/");
  if (spec.startsWith("#orm/")) return `${apiRoot}/ORM/${spec.slice("#orm/".length)}.js`;
  if (spec.startsWith("#helpers/")) return `${apiRoot}/Helpers/${spec.slice("#helpers/".length)}.js`;
  if (!spec.startsWith(".")) return null;
  const directory = posix.split("/").slice(0, -1).join("/");
  const joined = normalizePosix(`${directory}/${spec}`);
  return joined.endsWith(".js") ? joined : `${joined}.js`;
}

export function procedureId(database: string, name: string): string {
  return `procedure/${database}/${name.toLowerCase()}`;
}

export function lookupProcedure(
  procedures: readonly ProcedureFile[],
  name: string,
  preferredDatabase: string | null,
): ProcedureFile | undefined {
  const needle = name.toLowerCase();
  const matches = procedures.filter((file) => fileName(file.relativePath).toLowerCase() === needle);
  if (matches.length === 0) return undefined;
  if (preferredDatabase) {
    const preferred = matches.find((file) => file.database.toLowerCase() === preferredDatabase.toLowerCase());
    if (preferred) return preferred;
  }
  const hrms = matches.find((file) => file.database === "HRMS");
  return hrms ?? matches[0];
}

function fileName(relativePath: string): string {
  const base = relativePath.split("/").at(-1) ?? relativePath;
  return base.replace(/\.sql$/i, "");
}

function sectionKeyAtCall(body: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*\\(`).exec(body);
  if (!match || match.index === undefined) return null;
  return sectionKeyIn(body.slice(match.index, match.index + 500));
}

function dedupeExecs(execs: readonly HandlerExec[]): HandlerExec[] {
  const seen = new Set<string>();
  const unique: HandlerExec[] = [];
  for (const exec of execs) {
    const key = `${exec.relativePath}:${exec.line}:${exec.name}:${exec.sectionKey ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(exec);
  }
  return unique;
}

function normalizePosix(value: string): string {
  const parts: string[] = [];
  for (const part of value.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}
