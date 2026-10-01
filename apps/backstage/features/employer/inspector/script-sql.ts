import { isBuiltinReference } from "./script-builtins.ts";

const KEYWORDS = new Set(
  [
    "select",
    "from",
    "where",
    "and",
    "or",
    "not",
    "in",
    "is",
    "null",
    "join",
    "inner",
    "left",
    "right",
    "full",
    "cross",
    "outer",
    "on",
    "as",
    "insert",
    "into",
    "values",
    "update",
    "set",
    "delete",
    "create",
    "alter",
    "drop",
    "procedure",
    "proc",
    "function",
    "view",
    "table",
    "begin",
    "end",
    "if",
    "else",
    "while",
    "return",
    "returns",
    "declare",
    "exec",
    "execute",
    "go",
    "with",
    "union",
    "all",
    "distinct",
    "top",
    "order",
    "by",
    "group",
    "having",
    "case",
    "when",
    "then",
    "exists",
    "between",
    "like",
    "apply",
    "merge",
    "using",
    "output",
    "over",
    "partition",
    "try",
    "catch",
    "throw",
    "transaction",
    "commit",
    "rollback",
    "tran",
    "print",
    "raiserror",
    "option",
    "truncate",
  ],
);

const OBJECT_INTRODUCERS = new Set([
  "from",
  "join",
  "into",
  "update",
  "table",
  "exec",
  "execute",
  "apply",
  "merge",
  "using",
  "procedure",
  "proc",
  "function",
  "view",
]);

const OBJECT_LIST_END = new Set([
  "where",
  "set",
  "on",
  "group",
  "order",
  "having",
  "union",
  "select",
  "values",
  "begin",
  "end",
  "when",
  "then",
  "else",
  "return",
  "and",
  "or",
]);

export type SqlToken =
  | { type: "text"; value: string }
  | { type: "keyword"; value: string }
  | { type: "comment"; value: string }
  | { type: "string"; value: string }
  | { type: "number"; value: string }
  | { type: "builtin"; value: string }
  | { type: "variable"; value: string; name: string }
  | { type: "alias"; value: string; name: string }
  | { type: "ident"; value: string; name: string }
  | { type: "object"; value: string; schema: string; name: string };

type ListState = {
  objectSlot: boolean;
  objectList: boolean;
  aliasSlot: boolean;
  pendingAlias: boolean;
};

type IdentPart = { raw: string; name: string };

function isBareStart(char: string): boolean {
  return /[A-Za-z_@#]/.test(char);
}

function isBarePart(char: string): boolean {
  return /[A-Za-z0-9_@#$]/.test(char);
}

function readBracket(sql: string, index: number): { part: IdentPart; next: number } | null {
  if (sql[index] !== "[") {
    return null;
  }
  let name = "";
  let cursor = index + 1;
  while (cursor < sql.length) {
    if (sql[cursor] === "]" && sql[cursor + 1] === "]") {
      name += "]";
      cursor += 2;
      continue;
    }
    if (sql[cursor] === "]") {
      return {
        part: { raw: sql.slice(index, cursor + 1), name },
        next: cursor + 1,
      };
    }
    name += sql[cursor];
    cursor += 1;
  }
  return null;
}

function readBare(sql: string, index: number): { part: IdentPart; next: number } | null {
  if (!isBareStart(sql[index] ?? "")) {
    return null;
  }
  let cursor = index + 1;
  while (cursor < sql.length && isBarePart(sql[cursor] ?? "")) {
    cursor += 1;
  }
  const raw = sql.slice(index, cursor);
  return { part: { raw, name: raw }, next: cursor };
}

function readIdent(sql: string, index: number): { part: IdentPart; next: number } | null {
  return readBracket(sql, index) ?? readBare(sql, index);
}

function readChain(
  sql: string,
  index: number,
): { parts: IdentPart[]; next: number } | null {
  const first = readIdent(sql, index);
  if (!first) {
    return null;
  }
  const parts = [first.part];
  let cursor = first.next;
  while (sql[cursor] === ".") {
    const next = readIdent(sql, cursor + 1);
    if (!next) {
      break;
    }
    parts.push(next.part);
    cursor = next.next;
  }
  return { parts, next: cursor };
}

function isTempOrVariable(parts: IdentPart[]): boolean {
  return parts.some((part) => part.name.startsWith("@") || part.name.startsWith("#"));
}

function readNumber(sql: string, index: number): { value: string; next: number } | null {
  const char = sql[index] ?? "";
  const next = sql[index + 1] ?? "";
  const startDigit = char >= "0" && char <= "9";
  const startDot = char === "." && next >= "0" && next <= "9";
  if (!startDigit && !startDot) {
    return null;
  }
  let cursor = index + 1;
  if (startDigit) {
    while (cursor < sql.length && sql[cursor]! >= "0" && sql[cursor]! <= "9") {
      cursor += 1;
    }
    if (sql[cursor] === "." && (sql[cursor + 1] ?? "") >= "0" && (sql[cursor + 1] ?? "") <= "9") {
      cursor += 1;
      while (cursor < sql.length && sql[cursor]! >= "0" && sql[cursor]! <= "9") {
        cursor += 1;
      }
    }
  } else {
    while (cursor < sql.length && sql[cursor]! >= "0" && sql[cursor]! <= "9") {
      cursor += 1;
    }
  }
  return { value: sql.slice(index, cursor), next: cursor };
}

export function scriptObjectRefs(
  sql: string,
): Array<{ schema: string; name: string }> {
  const seen = new Set<string>();
  const refs: Array<{ schema: string; name: string }> = [];
  for (const token of tokenizeSql(sql)) {
    if (token.type !== "object") {
      continue;
    }
    const key = `${token.schema}.${token.name}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push({ schema: token.schema, name: token.name });
  }
  return refs;
}

export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  const listStack: ListState[] = [];
  let index = 0;
  let objectSlot = false;
  let objectList = false;
  let aliasSlot = false;
  let pendingAlias = false;

  function pushText(value: string): void {
    if (value.length === 0) {
      return;
    }
    const last = tokens[tokens.length - 1];
    if (last?.type === "text") {
      last.value += value;
      return;
    }
    tokens.push({ type: "text", value });
  }

  function clearAlias(): void {
    aliasSlot = false;
    pendingAlias = false;
    objectSlot = false;
  }

  while (index < sql.length) {
    const char = sql[index] ?? "";
    const next = sql[index + 1] ?? "";

    if (char === "-" && next === "-") {
      let cursor = sql.indexOf("\n", index);
      if (cursor === -1) {
        cursor = sql.length;
      } else {
        cursor += 1;
      }
      tokens.push({ type: "comment", value: sql.slice(index, cursor) });
      index = cursor;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", index + 2);
      const cursor = end === -1 ? sql.length : end + 2;
      tokens.push({ type: "comment", value: sql.slice(index, cursor) });
      index = cursor;
      continue;
    }

    if (char === "'" || (char.toLowerCase() === "n" && next === "'")) {
      const start = index;
      let cursor = char === "'" ? index + 1 : index + 2;
      while (cursor < sql.length) {
        if (sql[cursor] === "'" && sql[cursor + 1] === "'") {
          cursor += 2;
          continue;
        }
        if (sql[cursor] === "'") {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      tokens.push({ type: "string", value: sql.slice(start, cursor) });
      index = cursor;
      clearAlias();
      continue;
    }

    if (char === "(") {
      listStack.push({ objectSlot, objectList, aliasSlot, pendingAlias });
      objectSlot = false;
      objectList = false;
      aliasSlot = false;
      pendingAlias = false;
      pushText(char);
      index += 1;
      continue;
    }

    if (char === ")") {
      const saved = listStack.pop();
      pushText(char);
      index += 1;
      if (saved) {
        objectList = saved.objectList;
        aliasSlot = false;
        if (saved.objectSlot || saved.pendingAlias) {
          objectSlot = false;
          pendingAlias = true;
        } else {
          objectSlot = saved.objectSlot;
          pendingAlias = saved.pendingAlias;
        }
      }
      continue;
    }

    if (char === "," && objectList) {
      pushText(char);
      index += 1;
      objectSlot = true;
      aliasSlot = false;
      pendingAlias = false;
      continue;
    }

    const number = readNumber(sql, index);
    if (number) {
      tokens.push({ type: "number", value: number.value });
      index = number.next;
      clearAlias();
      continue;
    }

    const chain = readChain(sql, index);
    if (chain) {
      const raw = sql.slice(index, chain.next);
      const names = chain.parts.map((part) => part.name);
      const bareWord = chain.parts.length === 1 && !chain.parts[0]?.raw.startsWith("[");
      const single = bareWord ? (names[0]?.toLowerCase() ?? "") : "";
      const keyword = single.length > 0 && KEYWORDS.has(single);
      const head = chain.parts[0];

      if (keyword) {
        tokens.push({ type: "keyword", value: raw });
        if (OBJECT_INTRODUCERS.has(single)) {
          objectList = true;
          objectSlot = true;
          pendingAlias = false;
          aliasSlot = false;
        } else if (OBJECT_LIST_END.has(single)) {
          objectList = false;
          objectSlot = false;
          pendingAlias = false;
          aliasSlot = false;
        } else if (single === "as" && objectList && pendingAlias) {
          aliasSlot = true;
          objectSlot = false;
        } else {
          objectSlot = false;
          pendingAlias = false;
          aliasSlot = false;
        }
        index = chain.next;
        continue;
      }

      if (
        head &&
        !head.raw.startsWith("[") &&
        isBuiltinReference(names, sql, chain.next)
      ) {
        tokens.push({ type: "builtin", value: raw });
        index = chain.next;
        objectSlot = false;
        aliasSlot = false;
        pendingAlias = false;
        continue;
      }

      if (head && head.name.startsWith("@")) {
        tokens.push({ type: "variable", value: head.raw, name: head.name });
        pushText(raw.slice(head.raw.length));
        index = chain.next;
        clearAlias();
        continue;
      }

      const wantsAlias =
        objectList &&
        chain.parts.length === 1 &&
        (aliasSlot || pendingAlias) &&
        !isTempOrVariable(chain.parts);

      if (wantsAlias && head) {
        tokens.push({ type: "alias", value: raw, name: head.name });
        index = chain.next;
        clearAlias();
        continue;
      }

      const dboQualified = names.length >= 2 && names[0]?.toLowerCase() === "dbo";
      if ((objectSlot || dboQualified) && !isTempOrVariable(chain.parts)) {
        const schema = names.length >= 2 ? (names[names.length - 2] ?? "dbo") : "dbo";
        const name = names[names.length - 1] ?? "";
        if (name.length >= 2 && !name.startsWith("@") && !name.startsWith("#")) {
          tokens.push({ type: "object", value: raw, schema, name });
          objectSlot = false;
          aliasSlot = false;
          pendingAlias = true;
          index = chain.next;
          continue;
        }
      }

      if (head && chain.parts.length >= 2 && !head.name.startsWith("#")) {
        tokens.push({ type: "ident", value: head.raw, name: head.name });
        pushText(raw.slice(head.raw.length));
        index = chain.next;
        clearAlias();
        continue;
      }

      pushText(raw);
      index = chain.next;
      clearAlias();
      continue;
    }

    pushText(char);
    index += 1;
  }

  return tokens;
}
