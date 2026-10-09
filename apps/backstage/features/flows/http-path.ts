export function normalizeHttpPath(raw: string): string {
  let path = raw.split("?")[0]?.trim() ?? "";
  path = path.replace(/^\/+/, "");
  path = path.replace(/\$\{encodeURIComponent\(\s*String\(([^)]+)\)\s*\)\s*\}/g, (_full, name: string) =>
    paramName(name),
  );
  path = path.replace(/\$\{encodeURIComponent\(([^)]+)\)\}/g, (_full, name: string) => paramName(name));
  path = path.replace(/\$\{([^}]+)\}/g, (_full, expression: string) => paramName(expression));
  path = path.replace(/\/+/g, "/");
  path = path.replace(/\/$/, "");
  return path;
}

function paramName(expression: string): string {
  const name = expression.trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? `:${name}` : ":param";
}

export function joinRoutePath(prefix: string, expressPath: string): string {
  const joined = `${prefix}/${expressPath}`.replace(/\/+/g, "/");
  return normalizeHttpPath(joined.replace(/^\/api\//, ""));
}

export function pathsMatch(left: string, right: string): boolean {
  const a = left.split("/");
  const b = right.split("/");
  if (a.length !== b.length) return false;
  return a.every((segment, index) => {
    const other = b[index] ?? "";
    return segment === other || segment.startsWith(":") || other.startsWith(":");
  });
}

const HTTP_CALL =
  /HttpClient\.(get|put|post|patch|delete|head)(?:<[^>\n]{0,80}>)?\(\s*(['"`])([\s\S]*?)\2/gi;

export type HttpCall = {
  method: string;
  path: string;
  line: number;
  column: number;
};

export function extractHttpCalls(source: string): HttpCall[] {
  const masked = maskForHttp(source);
  const calls: HttpCall[] = [];
  for (const match of masked.matchAll(HTTP_CALL)) {
    const method = match[1];
    const raw = match[3];
    if (!method || raw === undefined || match.index === undefined) continue;
    const path = normalizeHttpPath(raw);
    if (!path || path.includes(" ")) continue;
    const position = positionOf(source, match.index);
    calls.push({ method: method.toUpperCase(), path, line: position.line, column: position.column });
  }
  if (calls.length === 0 && /updateSectionData/.test(masked)) {
    const key = /(?:const|let)\s+key\s*=\s*(['"`])([\s\S]*?)\1/.exec(masked);
    if (key?.[2] && key.index !== undefined) {
      const path = normalizeHttpPath(key[2]);
      if (path.startsWith("employees/")) {
        const position = positionOf(source, key.index);
        calls.push({ method: "PUT", path, line: position.line, column: position.column });
      }
    }
  }
  return calls;
}

function maskForHttp(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
}

function positionOf(source: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}
