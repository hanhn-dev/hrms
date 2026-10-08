/**
 * Validates that a SQL batch is a single read-only SELECT (or WITH…SELECT).
 * Rejects batches, DML, DDL, EXEC, and other mutating / multi-statement forms.
 */

const FORBIDDEN =
  /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|CREATE|ALTER|EXEC|EXECUTE|GRANT|REVOKE|DENY|BACKUP|RESTORE|DBCC|OPENROWSET|OPENDATASOURCE|BULK)\b/i;

export function assertSelectOnly(sql: string): string {
  const trimmed = sql.trim();
  if (trimmed === "") {
    throw new Error("SQL is required.");
  }

  // Strip block and line comments before validation.
  const withoutComments = trimmed
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .trim();

  if (withoutComments === "") {
    throw new Error("SQL is required.");
  }

  // No multi-statement batches (GO or semicolon-separated commands).
  if (/\bGO\b/i.test(withoutComments)) {
    throw new Error("Only a single SELECT statement is allowed (no GO batches).");
  }

  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (statements.length > 1) {
    throw new Error("Only a single SELECT statement is allowed (no semicolon batches).");
  }

  const body = statements[0] ?? withoutComments;
  if (!/^(WITH|SELECT)\b/i.test(body)) {
    throw new Error("Only SELECT or WITH…SELECT statements are allowed.");
  }

  if (FORBIDDEN.test(body)) {
    throw new Error(
      "Statement contains a forbidden keyword. Only read-only SELECT is allowed.",
    );
  }

  return body;
}

function isIdentChar(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

function matchKeyword(sql: string, index: number, word: string): boolean {
  if (index > 0 && isIdentChar(sql[index - 1] ?? "")) {
    return false;
  }
  if (sql.slice(index, index + word.length).toLowerCase() !== word.toLowerCase()) {
    return false;
  }
  const after = index + word.length;
  return after >= sql.length || !isIdentChar(sql[after] ?? "");
}

/** Last top-level ORDER BY, and a top-level OFFSET after it, if present. */
export function findTopLevelOrderBy(sql: string): {
  orderBy: number;
  offset: number;
} {
  let depth = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;
  let orderBy = -1;
  let offset = -1;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index] ?? "";
    const next = sql[index + 1] ?? "";

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (inString) {
      if (char === "'" && next === "'") {
        index += 1;
        continue;
      }
      if (char === "'") {
        inString = false;
      }
      continue;
    }
    if (char === "-" && next === "-") {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (char === "'") {
      inString = true;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0) {
      continue;
    }

    if (matchKeyword(sql, index, "ORDER")) {
      let cursor = index + "ORDER".length;
      while (cursor < sql.length && /\s/.test(sql[cursor] ?? "")) {
        cursor += 1;
      }
      if (matchKeyword(sql, cursor, "BY")) {
        orderBy = index;
        offset = -1;
        index = cursor + "BY".length - 1;
      }
      continue;
    }

    if (orderBy >= 0 && matchKeyword(sql, index, "OFFSET")) {
      offset = index;
    }
  }

  return { orderBy, offset };
}

/** Make a top-level ORDER BY legal inside a SQL Server derived table. */
export function allowOrderByInDerivedTable(sql: string): string {
  const { orderBy, offset } = findTopLevelOrderBy(sql);
  if (orderBy < 0 || offset >= 0) {
    return sql;
  }
  return `${sql.trimEnd()} OFFSET 0 ROWS`;
}

/**
 * Cap a single SELECT. A plain SELECT is wrapped in `SELECT TOP`.
 * A top-level ORDER BY gets `OFFSET 0 ROWS` so that wrap is valid.
 * `WITH` stays outside a derived table and uses `FETCH NEXT` instead.
 */
export function wrapSelectForLimit(sql: string, fetchTop: number): string {
  if (!Number.isInteger(fetchTop) || fetchTop < 1) {
    throw new Error("Row cap must be a positive integer.");
  }
  const body = sql.trim().replace(/;+\s*$/, "");
  if (/^WITH\b/i.test(body)) {
    return capCte(body, fetchTop);
  }
  const inner = allowOrderByInDerivedTable(body);
  return `SELECT TOP (${fetchTop}) * FROM (\n${inner}\n) AS TableCompare`;
}

function capCte(sql: string, fetchTop: number): string {
  const { orderBy, offset } = findTopLevelOrderBy(sql);
  if (offset >= 0) {
    return sql;
  }
  if (orderBy >= 0) {
    return `${sql.trimEnd()} OFFSET 0 ROWS FETCH NEXT ${fetchTop} ROWS ONLY`;
  }
  return `${sql.trimEnd()}\nORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT ${fetchTop} ROWS ONLY`;
}
