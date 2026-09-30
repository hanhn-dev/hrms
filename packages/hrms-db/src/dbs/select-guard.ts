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
