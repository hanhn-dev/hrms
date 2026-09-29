import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { sqlIdent, sqlTable } from "../history/sql";
import { assertAllowlistedIdent } from "./sql";

export type DbRuleCheckResult = {
  ok: boolean;
  message?: string;
};

/**
 * Custom SELECT for ValidationRule `existInDatabase` — no HRMS SPs/views/functions.
 * Only allowlisted SQL identifiers from rule params are accepted.
 */
export async function checkExistInDatabase(
  db: HrmsDb,
  input: {
    table: string;
    column: string;
    value: string | number | boolean | null;
    activeOnly?: boolean;
    errorMessage?: string;
  },
): Promise<DbRuleCheckResult> {
  if (input.value == null || input.value === "") {
    return { ok: true };
  }
  const table = assertAllowlistedIdent(input.table);
  const column = assertAllowlistedIdent(input.column);
  const activeClause = input.activeOnly
    ? Prisma.sql` AND (IsActive = 1 OR IsActive IS NULL)`
    : Prisma.empty;

  try {
    const rows = await db.$queryRaw<Array<{ Cnt: number | bigint }>>`
      SELECT COUNT_BIG(*) AS Cnt
      FROM ${sqlTable(table)}
      WHERE ${sqlIdent(column)} = ${input.value}
      ${activeClause}
    `;
    const count = Number(rows[0]?.Cnt ?? 0);
    if (count > 0) return { ok: true };
    return {
      ok: false,
      message: input.errorMessage || `Value was not found in ${table}.${column}.`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : `Could not check existence in ${table}.${column}.`,
    };
  }
}

/**
 * Custom SELECT for ValidationRule `uniqueInDatabase`.
 */
export async function checkUniqueInDatabase(
  db: HrmsDb,
  input: {
    table: string;
    column: string;
    value: string | number | boolean | null;
    excludeColumn?: string;
    excludeValue?: string | number | null;
    errorMessage?: string;
  },
): Promise<DbRuleCheckResult> {
  if (input.value == null || input.value === "") {
    return { ok: true };
  }
  const table = assertAllowlistedIdent(input.table);
  const column = assertAllowlistedIdent(input.column);
  const excludeColumn =
    input.excludeColumn != null && input.excludeColumn !== ""
      ? assertAllowlistedIdent(input.excludeColumn)
      : null;

  try {
    const excludeClause =
      excludeColumn != null &&
      input.excludeValue != null &&
      input.excludeValue !== ""
        ? Prisma.sql` AND ${sqlIdent(excludeColumn)} <> ${input.excludeValue}`
        : Prisma.empty;

    const rows = await db.$queryRaw<Array<{ Cnt: number | bigint }>>`
      SELECT COUNT_BIG(*) AS Cnt
      FROM ${sqlTable(table)}
      WHERE ${sqlIdent(column)} = ${input.value}
      ${excludeClause}
    `;
    const count = Number(rows[0]?.Cnt ?? 0);
    if (count === 0) return { ok: true };
    return {
      ok: false,
      message:
        input.errorMessage ||
        `Value already exists in ${table}.${column}.`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : `Could not check uniqueness in ${table}.${column}.`,
    };
  }
}
