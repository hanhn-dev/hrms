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
  | { type: "object"; value: string; schema: string; name: string };

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

function isVariable(parts: IdentPart[]): boolean {
  return parts.some((part) => part.name.startsWith("@") || part.name.startsWith("#"));
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
  let index = 0;
  let objectSlot = false;
  let objectList = false;
  let aliasSlot = false;

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
      aliasSlot = false;
      continue;
    }

    if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", index + 2);
      const cursor = end === -1 ? sql.length : end + 2;
      tokens.push({ type: "comment", value: sql.slice(index, cursor) });
      index = cursor;
      aliasSlot = false;
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
      aliasSlot = false;
      objectSlot = false;
      continue;
    }

    if (char === "," && objectList) {
      pushText(char);
      index += 1;
      objectSlot = true;
      aliasSlot = false;
      continue;
    }

    const chain = readChain(sql, index);
    if (chain) {
      const raw = sql.slice(index, chain.next);
      const names = chain.parts.map((part) => part.name);
      const bareWord = chain.parts.length === 1 && !chain.parts[0]?.raw.startsWith("[");
      const single = bareWord ? (names[0]?.toLowerCase() ?? "") : "";
      const keyword = single.length > 0 && KEYWORDS.has(single);

      if (keyword) {
        tokens.push({ type: "keyword", value: raw });
        if (OBJECT_INTRODUCERS.has(single)) {
          objectList = true;
          objectSlot = true;
        } else if (OBJECT_LIST_END.has(single)) {
          objectList = false;
          objectSlot = false;
        } else {
          objectSlot = false;
        }
        aliasSlot = single === "as";
        index = chain.next;
        continue;
      }

      if (aliasSlot || isVariable(chain.parts)) {
        pushText(raw);
        aliasSlot = false;
        objectSlot = false;
        index = chain.next;
        continue;
      }

      const dboQualified = names.length >= 2 && names[0]?.toLowerCase() === "dbo";
      if (objectSlot || dboQualified) {
        const schema = names.length >= 2 ? (names[names.length - 2] ?? "dbo") : "dbo";
        const name = names[names.length - 1] ?? "";
        if (name.length >= 2 && !name.startsWith("@") && !name.startsWith("#")) {
          tokens.push({ type: "object", value: raw, schema, name });
          objectSlot = false;
          aliasSlot = false;
          index = chain.next;
          continue;
        }
      }

      pushText(raw);
      objectSlot = false;
      aliasSlot = false;
      index = chain.next;
      continue;
    }

    pushText(char);
    index += 1;
  }

  return tokens;
}
