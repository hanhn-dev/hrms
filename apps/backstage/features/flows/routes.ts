import { maskComments, positionAt } from "./source-text.ts";

export type ParsedRoute = {
  method: string;
  path: string;
  controller: string;
  handler: string;
  line: number;
  column: number;
};

const METHOD = /\.(get|post|put|patch|delete|head)\s*\(/gi;
const CONTROLLER_HANDLER = /([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)/g;

export function parseRoutes(source: string): ParsedRoute[] {
  const masked = maskComments(source);
  const routes: ParsedRoute[] = [];
  for (const match of masked.matchAll(METHOD)) {
    if (match.index === undefined || !match[1]) continue;
    const open = match.index + match[0].length - 1;
    const args = sliceCall(masked, open);
    if (!args) continue;
    const path = firstString(args) ?? routePathBefore(masked, match.index);
    const handler = lastControllerHandler(args);
    if (!path || !handler) continue;
    const position = positionAt(source, match.index);
    routes.push({
      method: match[1].toUpperCase(),
      path,
      controller: handler.controller,
      handler: handler.handler,
      line: position.line,
      column: position.column,
    });
  }
  return routes;
}

function sliceCall(source: string, openParen: number): string | null {
  let depth = 0;
  for (let i = openParen; i < source.length; i += 1) {
    const char = source[i];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(openParen + 1, i);
    }
  }
  return null;
}

function firstString(args: string): string | null {
  const match = /(['"`])([^'"`]+)\1/.exec(args);
  return match?.[2] ?? null;
}

function lastControllerHandler(args: string): { controller: string; handler: string } | null {
  let found: { controller: string; handler: string } | null = null;
  for (const match of args.matchAll(CONTROLLER_HANDLER)) {
    if (!match[1] || !match[2]) continue;
    if (!/Controller$/.test(match[1]) && match[1] !== "ValidationController") continue;
    found = { controller: match[1], handler: match[2] };
  }
  if (found) return found;
  const loose = [...args.matchAll(CONTROLLER_HANDLER)];
  const last = loose.at(-1);
  if (!last?.[1] || !last[2]) return null;
  if (!last[1].endsWith("Controller")) return null;
  return { controller: last[1], handler: last[2] };
}

function routePathBefore(source: string, methodIndex: number): string | null {
  const window = source.slice(Math.max(0, methodIndex - 240), methodIndex);
  const matches = [...window.matchAll(/\.route\s*\(\s*(['"`])([^'"`]+)\1/g)];
  return matches.at(-1)?.[2] ?? null;
}

export type RequiredBinding = {
  localName: string;
  spec: string;
};

export function parseRequires(source: string): RequiredBinding[] {
  const masked = maskComments(source);
  const bindings: RequiredBinding[] = [];
  const pattern =
    /(?:const|let|var)\s+(?:([A-Za-z_][A-Za-z0-9_]*)|\{([^}]+)\})\s*=\s*require\(\s*(['"])([^'"]+)\3\s*\)/g;
  for (const match of masked.matchAll(pattern)) {
    const spec = match[4];
    if (!spec) continue;
    if (match[1]) bindings.push({ localName: match[1], spec });
    if (match[2]) {
      for (const part of match[2].split(",")) {
        const name = part.split(":")[0]?.trim();
        if (name && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
          bindings.push({ localName: name, spec });
        }
      }
    }
  }
  return bindings;
}

export function extractFunction(
  source: string,
  name: string,
): { body: string; start: number; end: number; line: number; column: number } | null {
  const masked = maskComments(source);
  const pattern = new RegExp(
    `(?:async\\s+)?function\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=\\s*async\\s*(?:function)?\\s*\\(`,
  );
  const match = pattern.exec(masked);
  if (!match || match.index === undefined) return null;
  const open = bodyBrace(masked, match.index + match[0].length - 1);
  if (open < 0) return null;
  const end = blockEnd(masked, open);
  if (end === null) return null;
  const position = positionAt(source, match.index);
  return {
    body: masked.slice(open + 1, end),
    start: open,
    end,
    line: position.line,
    column: position.column,
  };
}

function bodyBrace(source: string, openParen: number): number {
  let paren = 0;
  let index = openParen;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "(") paren += 1;
    else if (char === ")") {
      paren -= 1;
      if (paren === 0) {
        index += 1;
        break;
      }
    }
  }
  while (index < source.length && source[index] !== "{") index += 1;
  return index < source.length ? index : -1;
}

function blockEnd(source: string, openBrace: number): number | null {
  let depth = 0;
  for (let i = openBrace; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return null;
}

const SKIP_CALLS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "function",
  "return",
  "require",
  "await",
  "new",
  "typeof",
  "console",
  "Number",
  "String",
  "Boolean",
  "Array",
  "Object",
  "JSON",
  "Math",
  "parseInt",
  "parseFloat",
  "isNaN",
  "Error",
]);

export function calledNames(body: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) {
    const name = match[1];
    if (!name || SKIP_CALLS.has(name) || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

export function sectionKeyIn(source: string): string | null {
  const match = /SECTION_KEYS\.([A-Z0-9_]+)|SECTION\.([A-Z0-9_]+)/.exec(source);
  return match?.[1] ?? match?.[2] ?? null;
}
