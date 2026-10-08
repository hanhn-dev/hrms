"use server";

import { executeSelectForCompare } from "@hrms/db";
import type { HrmsDb } from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb, getSelectedEnvironment, listConfiguredEnvironments } from "@/shared/db";
import {
  resolveComparePair,
  splitCapturedScript,
  type CompareTableQueryResult,
  type ComparedStatement,
} from "@/shared/ui/data-table-compare";

export async function listTableCompareEnvironments(): Promise<{
  environments: string[];
  selected: string;
}> {
  await requireRootAdmin();
  return {
    environments: listConfiguredEnvironments(),
    selected: await getSelectedEnvironment(),
  };
}

export async function compareTableQuery(input: {
  script: string;
  rightEnv: string;
}): Promise<CompareTableQueryResult> {
  await requireRootAdmin();
  const statements = splitCapturedScript(input.script);
  if (statements.length === 0) {
    throw new Error("No SQL was recorded for this table.");
  }

  const leftEnv = await getSelectedEnvironment();
  const { rightEnv } = resolveComparePair(
    leftEnv,
    input.rightEnv,
    listConfiguredEnvironments(),
  );
  const [leftDb, rightDb] = await Promise.all([
    getHrmsDb(leftEnv),
    getHrmsDb(rightEnv),
  ]);

  const queries: ComparedStatement[] = [];
  for (const [index, sql] of statements.entries()) {
    const [left, right] = await Promise.all([
      runSide(leftDb, sql),
      runSide(rightDb, sql),
    ]);
    const error = sideError(left.error, right.error, leftEnv, rightEnv);
    queries.push({
      index,
      leftRows: error ? [] : left.rows,
      rightRows: error ? [] : right.rows,
      leftTruncated: error ? false : left.truncated,
      rightTruncated: error ? false : right.truncated,
      error,
      maxRows: left.maxRows ?? right.maxRows ?? 2000,
    });
  }

  return { leftEnv, rightEnv, queries };
}

async function runSide(
  db: HrmsDb,
  sql: string,
): Promise<{
  rows: Record<string, unknown>[];
  truncated: boolean;
  error: string | null;
  maxRows: number | null;
}> {
  try {
    const result = await executeSelectForCompare(db, sql);
    return {
      rows: result.rows,
      truncated: result.truncated,
      error: null,
      maxRows: result.maxRows,
    };
  } catch (error) {
    return {
      rows: [],
      truncated: false,
      error: error instanceof Error ? error.message : String(error),
      maxRows: null,
    };
  }
}

function sideError(
  left: string | null,
  right: string | null,
  leftEnv: string,
  rightEnv: string,
): string | null {
  if (!left && !right) {
    return null;
  }
  if (left && right && left === right) {
    return left;
  }
  return [left ? `${leftEnv}: ${left}` : null, right ? `${rightEnv}: ${right}` : null]
    .filter((part) => part !== null)
    .join(" ");
}
