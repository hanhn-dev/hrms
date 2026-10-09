export function maskComments(source: string): string {
  const chars = [...source];
  let i = 0;
  while (i < chars.length) {
    const current = chars[i];
    const next = chars[i + 1];
    if (current === "-" && next === "-") {
      while (i < chars.length && chars[i] !== "\n") {
        chars[i] = " ";
        i += 1;
      }
      continue;
    }
    if (current === "/" && next === "/") {
      while (i < chars.length && chars[i] !== "\n") {
        chars[i] = " ";
        i += 1;
      }
      continue;
    }
    if (current === "/" && next === "*") {
      chars[i] = " ";
      chars[i + 1] = " ";
      i += 2;
      while (i < chars.length && !(chars[i] === "*" && chars[i + 1] === "/")) {
        if (chars[i] !== "\n") chars[i] = " ";
        i += 1;
      }
      if (chars[i] === "*") {
        chars[i] = " ";
        chars[i + 1] = " ";
        i += 2;
      }
      continue;
    }
    if (current === "'" || current === "\"" || current === "`") {
      const quote = current;
      i += 1;
      while (i < chars.length && chars[i] !== quote) {
        if (chars[i] === "\\") {
          i += 2;
          continue;
        }
        if (chars[i] === "{" || chars[i] === "}") chars[i] = " ";
        i += 1;
      }
      i += 1;
      continue;
    }
    i += 1;
  }
  return chars.join("");
}

export function positionAt(source: string, index: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(index, source.length);
  for (let i = 0; i < end; i += 1) {
    if (source.charCodeAt(i) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

const EXEC_PATTERN =
  /\bEXEC(?:UTE)?\s+(?:(?:\[?([\w-]+)\]?\s*\.)?\[?dbo\]?\s*\.)?\[?((?:SP_|USP_|Usp_)[A-Za-z0-9_]+)\]?/gi;

export type ExecCall = {
  name: string;
  database: string | null;
  index: number;
  line: number;
  column: number;
};

export function extractExecCalls(source: string): ExecCall[] {
  const masked = maskComments(source);
  const calls: ExecCall[] = [];
  for (const match of masked.matchAll(EXEC_PATTERN)) {
    const name = match[2];
    if (!name || match.index === undefined || /^sp_executesql$/i.test(name)) continue;
    const position = positionAt(source, match.index);
    calls.push({
      name,
      database: match[1] && match[1].toLowerCase() !== "dbo" ? match[1] : null,
      index: match.index,
      line: position.line,
      column: position.column,
    });
  }
  return calls;
}

export function callsDynamicSql(source: string): boolean {
  return /\bsp_executesql\b/i.test(maskComments(source));
}

export function procedureDeclaration(source: string): { line: number; column: number } {
  const masked = maskComments(source);
  const match = /CREATE\s+(?:OR\s+ALTER\s+)?PROC(?:EDURE)?\b/i.exec(masked);
  if (!match || match.index === undefined) return { line: 1, column: 1 };
  return positionAt(source, match.index);
}
