import { extractHttpCalls, joinRoutePath, pathsMatch } from "./http-path.ts";
import type { FlowEdge, FlowGraph, FlowNode, ProcedureFile, TextFile } from "./model.ts";
import { extractFunction, parseRequires, parseRoutes } from "./routes.ts";
import { callsDynamicSql, extractExecCalls, positionAt, procedureDeclaration } from "./source-text.ts";
import { collectHandlerExecs, lookupProcedure, procedureId, resolveRequire } from "./trace.ts";

export const API_ROOT = "HRMS.CoreAPI/HRMS.Core.WebAPI.Node";
export const ROUTES_FILE = `${API_ROOT}/Features/Employee/MyDetails/routes.js`;
const ROUTE_PREFIX = "/api/employees";

const UNMATCHED_ROUTE = "No My Details caller";
const UNMATCHED_SDK = "Unmatched route";
const NO_PROCEDURE = "No stored procedure call in this handler.";
const DYNAMIC_SQL = "This file calls sp_executesql, so some procedure calls are not in the graph.";
const MISSING_PROCEDURE = "Procedure file was not found in the database repo.";

export function assembleFlowGraph(input: {
  procedures: readonly ProcedureFile[];
  apiFiles: ReadonlyMap<string, string>;
  sdkFiles: readonly TextFile[];
  screenFiles: readonly TextFile[];
}): FlowGraph {
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const edgeIds = new Set<string>();

  const addEdge = (edge: FlowEdge): void => {
    if (edgeIds.has(edge.id)) return;
    edgeIds.add(edge.id);
    edges.push(edge);
  };

  indexProcedures(input.procedures, nodes, addEdge);

  const routeMeta = indexRoutes(input.apiFiles, input.procedures, nodes, addEdge);
  const sdkByExport = indexSdk(input.sdkFiles, routeMeta, nodes, addEdge);
  indexScreens(input.screenFiles, sdkByExport, routeMeta, nodes, addEdge);
  flagUnmatchedRoutes(nodes, edges);

  const list = [...nodes.values()];
  return {
    version: 1,
    nodes: list,
    edges,
    stats: {
      procedures: list.filter((node) => node.kind === "procedure").length,
      routes: list.filter((node) => node.kind === "route").length,
      unmatchedRoutes: list.filter((node) => node.kind === "route" && node.gap === UNMATCHED_ROUTE).length,
      unmatchedSdkCalls: list.filter((node) => node.kind === "sdkCall" && node.gap === UNMATCHED_SDK).length,
      dynamicSqlFiles: list.filter((node) => node.kind === "procedure" && node.incomplete).length,
    },
  };
}

type RouteMeta = {
  id: string;
  method: string;
  pattern: string;
};

function indexProcedures(
  procedures: readonly ProcedureFile[],
  nodes: Map<string, FlowNode>,
  addEdge: (edge: FlowEdge) => void,
): void {
  for (const file of procedures) {
    const name = sqlName(file.relativePath);
    const declaration = procedureDeclaration(file.source);
    const dynamic = callsDynamicSql(file.source);
    const id = procedureId(file.database, name);
    nodes.set(id, {
      id,
      kind: "procedure",
      label: name,
      detail: file.database,
      source: { repo: "hrms-db", path: file.relativePath, line: declaration.line, column: declaration.column },
      incomplete: dynamic,
      gap: dynamic ? DYNAMIC_SQL : null,
    });
  }

  for (const file of procedures) {
    const fromId = procedureId(file.database, sqlName(file.relativePath));
    for (const exec of extractExecCalls(file.source)) {
      const target = lookupProcedure(procedures, exec.name, exec.database ?? file.database);
      const toId = target
        ? procedureId(target.database, sqlName(target.relativePath))
        : procedureId(exec.database ?? file.database, exec.name);
      if (!nodes.has(toId)) {
        nodes.set(toId, {
          id: toId,
          kind: "procedure",
          label: exec.name,
          detail: exec.database ?? file.database,
          source: null,
          incomplete: false,
          gap: MISSING_PROCEDURE,
        });
      }
      addEdge({
        id: `exec/${fromId}/${toId}/${exec.line}/${exec.column}`,
        from: fromId,
        to: toId,
        kind: "exec",
        label: "read from source",
        confidence: "extracted",
        sectionKey: null,
        source: { repo: "hrms-db", path: file.relativePath, line: exec.line, column: exec.column },
      });
    }
  }
}

function indexRoutes(
  apiFiles: ReadonlyMap<string, string>,
  procedures: readonly ProcedureFile[],
  nodes: Map<string, FlowNode>,
  addEdge: (edge: FlowEdge) => void,
): RouteMeta[] {
  const routesSource = apiFiles.get(ROUTES_FILE) ?? "";
  const bindings = parseRequires(routesSource);
  const meta: RouteMeta[] = [];
  for (const route of parseRoutes(routesSource)) {
    const pattern = joinRoutePath(ROUTE_PREFIX, route.path);
    const id = `route/${route.method}/${pattern}`;
    if (nodes.has(id)) continue;
    const binding = bindings.find((item) => item.localName === route.controller);
    const controllerPath = binding ? resolveRequire(ROUTES_FILE, binding.spec, API_ROOT) : null;
    const controllerSource = controllerPath ? apiFiles.get(controllerPath) : undefined;
    const handler = controllerSource ? extractFunction(controllerSource, route.handler) : null;
    const handlerId = `handler/${controllerPath ?? route.controller}/${route.handler}`;
    nodes.set(id, {
      id,
      kind: "route",
      label: `${route.method} ${pattern}`,
      detail: `${route.method} /api/${pattern}`,
      source: { repo: "sourcecode", path: ROUTES_FILE, line: route.line, column: route.column },
      incomplete: false,
      gap: null,
    });
    nodes.set(handlerId, {
      id: handlerId,
      kind: "handler",
      label: `${route.controller}.${route.handler}`,
      detail: controllerPath ?? route.controller,
      source: controllerPath
        ? {
            repo: "sourcecode",
            path: controllerPath,
            line: handler?.line ?? 1,
            column: handler?.column ?? 1,
          }
        : null,
      incomplete: false,
      gap: null,
    });
    addEdge({
      id: `handles/${id}/${handlerId}`,
      from: id,
      to: handlerId,
      kind: "handles",
      label: "read from source",
      confidence: "extracted",
      sectionKey: null,
      source: { repo: "sourcecode", path: ROUTES_FILE, line: route.line, column: route.column },
    });

    const execs = controllerPath
      ? collectHandlerExecs({
          files: apiFiles,
          apiRoot: API_ROOT,
          controllerPath,
          handlerName: route.handler,
        })
      : [];
    if (execs.length === 0) {
      const handlerNode = nodes.get(handlerId);
      if (handlerNode) handlerNode.gap = NO_PROCEDURE;
    }
    for (const exec of execs) {
      const target = lookupProcedure(procedures, exec.name, exec.database ?? "HRMS");
      const toId = target
        ? procedureId(target.database, sqlName(target.relativePath))
        : procedureId(exec.database ?? "HRMS", exec.name);
      if (!nodes.has(toId)) {
        nodes.set(toId, {
          id: toId,
          kind: "procedure",
          label: exec.name,
          detail: exec.database ?? "HRMS",
          source: null,
          incomplete: false,
          gap: MISSING_PROCEDURE,
        });
      }
      addEdge({
        id: `exec/${handlerId}/${toId}/${exec.line}/${exec.sectionKey ?? ""}`,
        from: handlerId,
        to: toId,
        kind: "exec",
        label: exec.sectionKey ? `section ${exec.sectionKey}` : "read from source",
        confidence: "extracted",
        sectionKey: exec.sectionKey,
        source: { repo: "sourcecode", path: exec.relativePath, line: exec.line, column: exec.column },
      });
    }
    meta.push({ id, method: route.method, pattern });
  }
  return meta;
}

function indexSdk(
  sdkFiles: readonly TextFile[],
  routes: readonly RouteMeta[],
  nodes: Map<string, FlowNode>,
  addEdge: (edge: FlowEdge) => void,
): Map<string, string[]> {
  const byExport = new Map<string, string[]>();
  for (const file of sdkFiles) {
    if (file.relativePath.includes(".test.")) continue;
    const calls = extractHttpCalls(file.source).filter((call) => call.path.startsWith("employees/"));
    const exportName = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/.exec(file.source)?.[1];
    const ids: string[] = [];
    for (const call of calls) {
      const id = `sdk/hrms-sdk/${file.relativePath}/${call.line}`;
      const matched = routes.find((route) => route.method === call.method && pathsMatch(call.path, route.pattern));
      nodes.set(id, {
        id,
        kind: "sdkCall",
        label: exportName ?? `${call.method} ${call.path}`,
        detail: `${call.method} ${call.path}`,
        source: { repo: "hrms-sdk", path: file.relativePath, line: call.line, column: call.column },
        incomplete: false,
        gap: matched ? null : UNMATCHED_SDK,
      });
      ids.push(id);
      if (matched) {
        addEdge({
          id: `http/${id}/${matched.id}`,
          from: id,
          to: matched.id,
          kind: "http",
          label: "read from source",
          confidence: "extracted",
          sectionKey: null,
          source: { repo: "hrms-sdk", path: file.relativePath, line: call.line, column: call.column },
        });
      }
    }
    if (exportName && ids.length > 0) byExport.set(exportName, ids);
  }
  for (const file of sdkFiles) {
    if (file.relativePath.includes(".test.")) continue;
    const exportName = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/.exec(file.source)?.[1];
    if (!exportName) continue;
    const linked = importedNames(file.source).flatMap((name) => byExport.get(name) ?? []);
    if (linked.length === 0) continue;
    const existing = byExport.get(exportName) ?? [];
    byExport.set(exportName, [...new Set([...existing, ...linked])]);
  }
  return byExport;
}

function importedNames(source: string): string[] {
  const names: string[] = [];
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g)) {
    const body = match[1];
    if (!body) continue;
    for (const part of body.split(",")) {
      const name = part.split(" as ")[0]?.trim();
      if (name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) names.push(name);
    }
  }
  return names;
}

function indexScreens(
  screenFiles: readonly TextFile[],
  sdkByExport: ReadonlyMap<string, string[]>,
  routes: readonly RouteMeta[],
  nodes: Map<string, FlowNode>,
  addEdge: (edge: FlowEdge) => void,
): void {
  for (const file of screenFiles) {
    if (file.relativePath.includes(".test.")) continue;
    const imported = importedSdkNames(file.source);
    const linked = imported.flatMap((name) => sdkByExport.get(name) ?? []);
    const localCalls = extractHttpCalls(file.source).filter((call) => call.path.startsWith("employees/"));
    if (linked.length === 0 && localCalls.length === 0) continue;
    const screenId = `screen/${file.relativePath}`;
    const screenLabel = file.relativePath.split("/").at(-1)?.replace(/\.tsx?$/, "") ?? file.relativePath;
    const importAt = file.source.indexOf("@hrms/sdk");
    const screenPosition = importAt >= 0 ? positionAt(file.source, importAt) : { line: 1, column: 1 };
    nodes.set(screenId, {
      id: screenId,
      kind: "screen",
      label: screenLabel,
      detail: file.relativePath,
      source: { repo: "sourcecode", path: file.relativePath, line: screenPosition.line, column: screenPosition.column },
      incomplete: false,
      gap: null,
    });
    for (const sdkId of linked) {
      addEdge({
        id: `http/${screenId}/${sdkId}`,
        from: screenId,
        to: sdkId,
        kind: "http",
        label: "read from source",
        confidence: "extracted",
        sectionKey: null,
        source: nodes.get(screenId)?.source ?? null,
      });
    }
    for (const call of localCalls) {
      const sdkId = `sdk/sourcecode/${file.relativePath}/${call.line}`;
      const matched = routes.find((route) => route.method === call.method && pathsMatch(call.path, route.pattern));
      nodes.set(sdkId, {
        id: sdkId,
        kind: "sdkCall",
        label: `${call.method} ${call.path}`,
        detail: `${call.method} ${call.path}`,
        source: { repo: "sourcecode", path: file.relativePath, line: call.line, column: call.column },
        incomplete: false,
        gap: matched ? null : UNMATCHED_SDK,
      });
      addEdge({
        id: `http/${screenId}/${sdkId}`,
        from: screenId,
        to: sdkId,
        kind: "http",
        label: "read from source",
        confidence: "extracted",
        sectionKey: null,
        source: { repo: "sourcecode", path: file.relativePath, line: call.line, column: call.column },
      });
      if (matched) {
        addEdge({
          id: `http/${sdkId}/${matched.id}`,
          from: sdkId,
          to: matched.id,
          kind: "http",
          label: "read from source",
          confidence: "extracted",
          sectionKey: null,
          source: { repo: "sourcecode", path: file.relativePath, line: call.line, column: call.column },
        });
      }
    }
  }
}

function flagUnmatchedRoutes(nodes: Map<string, FlowNode>, edges: readonly FlowEdge[]): void {
  const called = new Set(edges.filter((edge) => edge.kind === "http").map((edge) => edge.to));
  for (const node of nodes.values()) {
    if (node.kind === "route" && !called.has(node.id)) node.gap = UNMATCHED_ROUTE;
  }
}

function importedSdkNames(source: string): string[] {
  const names: string[] = [];
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@hrms\/sdk['"]/g)) {
    const body = match[1];
    if (!body) continue;
    for (const part of body.split(",")) {
      const name = part.split(" as ")[0]?.trim();
      if (name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) names.push(name);
    }
  }
  return names;
}

function sqlName(relativePath: string): string {
  const base = relativePath.split("/").at(-1) ?? relativePath;
  return base.replace(/\.sql$/i, "");
}
