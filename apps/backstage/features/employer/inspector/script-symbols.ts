import type { SqlToken } from "./script-sql.ts";

export type SqlSymbolKind = "parameter" | "local" | "alias";

export type SqlSymbol = {
  id: string;
  kind: SqlSymbolKind;
  name: string;
  typeText: string | null;
  target: string | null;
  line: number;
  hint: string;
  declToken: number;
  uses: number[];
};

export type BoundToken = {
  token: SqlToken;
  symbolId: string | null;
  role: "declaration" | "use" | null;
  kind: SqlSymbolKind | "system" | null;
};

export type SqlFold = {
  id: string;
  startLine: number;
  endLine: number;
  kind: "begin" | "case" | "paren";
};

export type SqlModel = {
  tokens: BoundToken[];
  symbols: SqlSymbol[];
  folds: SqlFold[];
};

type Phase = "body" | "seek-module" | "seek-name" | "params";

type Frame = {
  parent: number;
  aliases: Map<string, string>;
};

const DECLARE_END = new Set([
  "select",
  "set",
  "begin",
  "if",
  "while",
  "return",
  "returns",
  "insert",
  "update",
  "delete",
  "exec",
  "execute",
  "with",
  "end",
  "else",
  "print",
  "raiserror",
  "throw",
  "commit",
  "rollback",
  "merge",
  "from",
  "where",
  "join",
  "go",
  "create",
  "alter",
  "drop",
  "try",
  "catch",
  "open",
  "fetch",
  "close",
  "truncate",
  "option",
]);

function newlineCount(value: string): number {
  let count = 0;
  for (const char of value) {
    if (char === "\n") {
      count += 1;
    }
  }
  return count;
}

function tokenStartLines(tokens: readonly SqlToken[]): number[] {
  const lines: number[] = [];
  let line = 0;
  for (const token of tokens) {
    lines.push(line);
    line += newlineCount(token.value);
  }
  return lines;
}

function previousSignificant(tokens: readonly SqlToken[], index: number): SqlToken | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (!token || token.type === "comment") {
      continue;
    }
    if (token.type === "text" && token.value.trim() === "") {
      continue;
    }
    return token;
  }
  return null;
}

function endsWith(token: SqlToken, marker: string): boolean {
  return token.type === "text" && token.value.trim().endsWith(marker);
}

function isFreshParameter(tokens: readonly SqlToken[], index: number): boolean {
  const previous = previousSignificant(tokens, index);
  if (!previous) {
    return true;
  }
  if (previous.type === "keyword") {
    const word = previous.value.toLowerCase();
    return word === "procedure" || word === "proc" || word === "function";
  }
  if (previous.type === "object" || previous.type === "ident") {
    return true;
  }
  if (endsWith(previous, ",") || endsWith(previous, "(")) {
    return true;
  }
  if (
    previous.type === "text" &&
    /^[A-Za-z_[]/.test(previous.value.trim()) &&
    !previous.value.includes("=")
  ) {
    return true;
  }
  return false;
}

function isFreshLocal(tokens: readonly SqlToken[], index: number): boolean {
  const previous = previousSignificant(tokens, index);
  if (!previous) {
    return false;
  }
  if (previous.type === "keyword" && previous.value.toLowerCase() === "declare") {
    return true;
  }
  return endsWith(previous, ",");
}

function isModuleName(token: SqlToken): boolean {
  if (token.type === "object" || token.type === "ident" || token.type === "alias") {
    return true;
  }
  return token.type === "text" && /[A-Za-z_\[]/.test(token.value);
}

function readType(tokens: readonly SqlToken[], start: number, mode: "param" | "declare"): string | null {
  let depth = 0;
  let raw = "";
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || token.type === "comment") {
      continue;
    }
    if (token.type === "variable" && depth === 0) {
      break;
    }
    if (token.type === "keyword" && depth === 0) {
      const word = token.value.toLowerCase();
      if (word === "as" || word === "returns" || (mode === "declare" && DECLARE_END.has(word))) {
        break;
      }
    }
    let stopped = false;
    for (const char of token.value) {
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        if (depth === 0) {
          stopped = true;
          break;
        }
        depth -= 1;
      } else if (depth === 0 && (char === "," || char === "=")) {
        stopped = true;
        break;
      }
      raw += char;
    }
    if (stopped) {
      break;
    }
  }
  const typeText = raw.replace(/\b(OUTPUT|OUT|READONLY)\b/gi, "").replace(/\s+/g, " ").trim();
  return typeText.length > 0 ? typeText : null;
}

function aliasTarget(tokens: readonly SqlToken[], index: number): string | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (!token || token.type === "comment") {
      continue;
    }
    if (token.type === "text" && token.value.trim() === "") {
      continue;
    }
    if (token.type === "keyword" && token.value.toLowerCase() === "as") {
      continue;
    }
    if (token.type === "object") {
      return `${token.schema}.${token.name}`;
    }
    if (token.type === "text" && token.value.includes(")")) {
      return "(subquery)";
    }
    return null;
  }
  return null;
}

function symbolHint(symbol: Pick<SqlSymbol, "kind" | "name" | "typeText" | "target" | "line">): string {
  if (symbol.kind === "parameter") {
    return symbol.typeText ? `Input ${symbol.name} ${symbol.typeText}` : `Input ${symbol.name}`;
  }
  if (symbol.kind === "local") {
    const typeText = symbol.typeText ? ` ${symbol.typeText}` : "";
    return `Local ${symbol.name}${typeText}, line ${symbol.line}`;
  }
  return symbol.target ? `Alias ${symbol.name} → ${symbol.target}` : `Alias ${symbol.name}`;
}

function nextKeyword(tokens: readonly SqlToken[], index: number): string | null {
  for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (!token || token.type === "comment") {
      continue;
    }
    if (token.type === "text" && token.value.trim() === "") {
      continue;
    }
    if (token.type === "keyword") {
      return token.value.toLowerCase();
    }
    return null;
  }
  return null;
}

function findFolds(tokens: readonly SqlToken[]): SqlFold[] {
  const folds: SqlFold[] = [];
  const blocks: Array<{ kind: "begin" | "case"; line: number }> = [];
  const parens: number[] = [];
  let line = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    const startLine = line;
    if (token.type === "keyword") {
      const word = token.value.toLowerCase();
      if (word === "begin") {
        const following = nextKeyword(tokens, index);
        if (following !== "tran" && following !== "transaction") {
          blocks.push({ kind: "begin", line: startLine });
        }
      } else if (word === "case") {
        blocks.push({ kind: "case", line: startLine });
      } else if (word === "end") {
        const open = blocks.pop();
        if (open && startLine > open.line) {
          folds.push({
            id: `fold-${folds.length}`,
            startLine: open.line,
            endLine: startLine,
            kind: open.kind,
          });
        }
      }
    }
    if (token.type === "string" || token.type === "comment") {
      line += newlineCount(token.value);
      continue;
    }
    for (const char of token.value) {
      if (char === "\n") {
        line += 1;
      } else if (char === "(") {
        parens.push(line);
      } else if (char === ")") {
        const openLine = parens.pop();
        if (openLine !== undefined && line > openLine) {
          folds.push({
            id: `fold-${folds.length}`,
            startLine: openLine,
            endLine: line,
            kind: "paren",
          });
        }
      }
    }
  }

  return folds;
}

function moveFrames(token: SqlToken, frames: Frame[], frameCursor: number): number {
  if (token.type === "string" || token.type === "comment") {
    return frameCursor;
  }
  let cursor = frameCursor;
  for (const char of token.value) {
    if (char === "(") {
      frames.push({ parent: cursor, aliases: new Map() });
      cursor = frames.length - 1;
      continue;
    }
    if (char !== ")") {
      continue;
    }
    const frame = frames[cursor];
    if (frame && frame.parent >= 0) {
      cursor = frame.parent;
    }
  }
  return cursor;
}

export function bindSql(tokens: readonly SqlToken[]): SqlModel {
  const lines = tokenStartLines(tokens);
  const bound: BoundToken[] = tokens.map((token) => ({
    token,
    symbolId: null,
    role: null,
    kind: token.type === "variable" && token.name.startsWith("@@") ? "system" : null,
  }));
  const symbols: SqlSymbol[] = [];
  const variables = new Map<string, string>();
  const frames: Frame[] = [{ parent: -1, aliases: new Map() }];
  const tokenFrame: number[] = [];
  let frameCursor = 0;
  let phase: Phase = "body";
  let headerClosed = false;
  let declareOpen = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const slot = bound[index];
    if (!token || !slot) {
      continue;
    }
    tokenFrame[index] = frameCursor;

    if (phase === "seek-name" && isModuleName(token)) {
      phase = "params";
    }

    if (token.type === "keyword") {
      const word = token.value.toLowerCase();
      if ((word === "create" || word === "alter") && phase === "body" && !headerClosed) {
        phase = "seek-module";
      } else if ((word === "procedure" || word === "proc" || word === "function") && phase === "seek-module") {
        phase = "seek-name";
      } else if (word === "as" && phase === "params" && frameCursor === 0) {
        phase = "body";
        headerClosed = true;
        declareOpen = false;
      }
      if (word === "declare" && phase === "body") {
        declareOpen = true;
      } else if (declareOpen && frameCursor === 0 && DECLARE_END.has(word)) {
        declareOpen = false;
      }
    }

    if (token.type === "variable" && slot.kind !== "system") {
      const key = token.name.toLowerCase();
      const existing = variables.get(key);
      const declareParameter = phase === "params" && isFreshParameter(tokens, index) && !existing;
      const declareLocal = declareOpen && frameCursor === 0 && isFreshLocal(tokens, index) && !existing;
      if (declareParameter || declareLocal) {
        const kind: SqlSymbolKind = declareParameter ? "parameter" : "local";
        const id = declareParameter ? `param:${key}` : `local:${key}:${index}`;
        const typeText = readType(tokens, index + 1, declareParameter ? "param" : "declare");
        const symbol: SqlSymbol = {
          id,
          kind,
          name: token.name,
          typeText,
          target: null,
          line: (lines[index] ?? 0) + 1,
          hint: "",
          declToken: index,
          uses: [],
        };
        symbol.hint = symbolHint(symbol);
        symbols.push(symbol);
        variables.set(key, id);
        slot.symbolId = id;
        slot.role = "declaration";
        slot.kind = kind;
      }
    } else if (token.type === "alias") {
      const key = token.name.toLowerCase();
      const id = `alias:${key}:${index}`;
      const target = aliasTarget(tokens, index);
      const symbol: SqlSymbol = {
        id,
        kind: "alias",
        name: token.name,
        typeText: null,
        target,
        line: (lines[index] ?? 0) + 1,
        hint: "",
        declToken: index,
        uses: [],
      };
      symbol.hint = symbolHint(symbol);
      symbols.push(symbol);
      frames[frameCursor]?.aliases.set(key, id);
      slot.symbolId = id;
      slot.role = "declaration";
      slot.kind = "alias";
    }

    if (declareOpen && statementEnded(token, frameCursor)) {
      declareOpen = false;
    }

    frameCursor = moveFrames(token, frames, frameCursor);
  }

  const byId = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const slot = bound[index];
    if (!token || !slot || slot.role === "declaration" || slot.kind === "system") {
      continue;
    }
    if (token.type === "variable") {
      const id = variables.get(token.name.toLowerCase());
      if (!id) {
        slot.kind = "local";
        continue;
      }
      slot.symbolId = id;
      slot.role = "use";
      slot.kind = byId.get(id)?.kind ?? "local";
      byId.get(id)?.uses.push(index);
      continue;
    }
    if (token.type === "ident") {
      const id = lookupAlias(frames, tokenFrame[index] ?? 0, token.name);
      if (!id) {
        continue;
      }
      slot.symbolId = id;
      slot.role = "use";
      slot.kind = "alias";
      byId.get(id)?.uses.push(index);
    }
  }

  return { tokens: bound, symbols, folds: findFolds(tokens) };
}

function statementEnded(token: SqlToken, frameCursor: number): boolean {
  if (token.type === "string" || token.type === "comment") {
    return false;
  }
  let depth = frameCursor;
  for (const char of token.value) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if (char === ";" && depth === 0) {
      return true;
    }
  }
  return false;
}

function lookupAlias(frames: readonly Frame[], frameId: number, name: string): string | null {
  const key = name.toLowerCase();
  let cursor = frameId;
  const seen = new Set<number>();
  while (cursor >= 0 && !seen.has(cursor)) {
    seen.add(cursor);
    const found = frames[cursor]?.aliases.get(key);
    if (found) {
      return found;
    }
    cursor = frames[cursor]?.parent ?? -1;
  }
  return null;
}
