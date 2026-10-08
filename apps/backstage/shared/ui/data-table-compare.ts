export type ComparedStatement = {
  index: number;
  leftRows: Record<string, unknown>[];
  rightRows: Record<string, unknown>[];
  leftTruncated: boolean;
  rightTruncated: boolean;
  error: string | null;
  maxRows: number;
};

export type CompareTableQueryResult = {
  leftEnv: string;
  rightEnv: string;
  queries: ComparedStatement[];
};

export type QueryDiffStatus = "only-left" | "only-right" | "changed";

export type QueryDiffChange = {
  left: unknown;
  right: unknown;
};

export type QueryDiffRow = {
  status: QueryDiffStatus;
  values: Record<string, unknown>;
  changes: Record<string, QueryDiffChange>;
};

export type QueryDiff = {
  columns: string[];
  rows: QueryDiffRow[];
  counts: Record<QueryDiffStatus, number>;
};

const EMPTY_COUNTS: Record<QueryDiffStatus, number> = {
  "only-left": 0,
  "only-right": 0,
  changed: 0,
};

/** Surrogate keys such as FieldID and EmployerId. Not Valid or Grid. */
export function isDefaultIgnoredColumn(name: string): boolean {
  return name.endsWith("ID") || name.endsWith("Id");
}

export function splitCapturedScript(script: string): string[] {
  if (typeof script !== "string" || script.trim() === "") {
    return [];
  }
  const parts = script.split(/\n\n(?=-- query \d+\n)/);
  return parts
    .map((part) => {
      const match = part.match(/^-- query \d+\n([\s\S]*)$/);
      return (match?.[1] ?? part).trim();
    })
    .filter((sql) => sql !== "");
}

export function resolveComparePair(
  leftEnv: string,
  rightEnvRaw: string,
  configured: readonly string[],
): { rightEnv: string } {
  const rightEnv = rightEnvRaw.trim().toUpperCase();
  if (!configured.includes(rightEnv)) {
    throw new Error(`Unknown environment: ${rightEnvRaw.trim()}`);
  }
  if (leftEnv === rightEnv) {
    throw new Error("Pick a different environment to compare against.");
  }
  return { rightEnv };
}

export function formatCompareValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

export function diffQueryRows(
  leftRows: readonly Record<string, unknown>[],
  rightRows: readonly Record<string, unknown>[],
  options?: {
    ignoreColumns?: readonly string[];
    matchColumns?: readonly string[];
  },
): QueryDiff {
  const columns = unionColumns(leftRows, rightRows);
  const ignore = new Set(
    options?.ignoreColumns === undefined
      ? columns.filter(isDefaultIgnoredColumn)
      : options.ignoreColumns,
  );
  const visible = columns.filter((column) => !ignore.has(column));
  const requested = (options?.matchColumns ?? []).filter((column) =>
    visible.includes(column),
  );
  const useKey = requested.length > 0 && requested.length < visible.length;
  const rows = useKey
    ? diffByKey(leftRows, rightRows, visible, requested)
    : diffMultiset(leftRows, rightRows, visible);
  const counts = { ...EMPTY_COUNTS };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return { columns: visible, rows, counts };
}

function unionColumns(
  leftRows: readonly Record<string, unknown>[],
  rightRows: readonly Record<string, unknown>[],
): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of [...leftRows, ...rightRows]) {
    for (const column of Object.keys(row)) {
      if (seen.has(column)) {
        continue;
      }
      seen.add(column);
      columns.push(column);
    }
  }
  return columns;
}

function normalize(value: unknown): unknown {
  return value === undefined ? null : value;
}

function signature(
  row: Record<string, unknown>,
  columns: readonly string[],
): string {
  return JSON.stringify(columns.map((column) => normalize(row[column])));
}

function project(
  row: Record<string, unknown>,
  columns: readonly string[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const column of columns) {
    values[column] = normalize(row[column]);
  }
  return values;
}

function diffMultiset(
  leftRows: readonly Record<string, unknown>[],
  rightRows: readonly Record<string, unknown>[],
  columns: readonly string[],
): QueryDiffRow[] {
  const leftCounts = countBySignature(leftRows, columns);
  const rightCounts = countBySignature(rightRows, columns);
  const rows: QueryDiffRow[] = [];
  const seenLeft = new Set<string>();
  const seenRight = new Set<string>();

  for (const row of leftRows) {
    const key = signature(row, columns);
    if (seenLeft.has(key)) {
      continue;
    }
    seenLeft.add(key);
    const extra = (leftCounts.get(key) ?? 0) - (rightCounts.get(key) ?? 0);
    for (let index = 0; index < extra; index += 1) {
      rows.push({
        status: "only-left",
        values: project(row, columns),
        changes: {},
      });
    }
  }

  for (const row of rightRows) {
    const key = signature(row, columns);
    if (seenRight.has(key)) {
      continue;
    }
    seenRight.add(key);
    const extra = (rightCounts.get(key) ?? 0) - (leftCounts.get(key) ?? 0);
    for (let index = 0; index < extra; index += 1) {
      rows.push({
        status: "only-right",
        values: project(row, columns),
        changes: {},
      });
    }
  }

  return rows;
}

function countBySignature(
  rows: readonly Record<string, unknown>[],
  columns: readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = signature(row, columns);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function diffByKey(
  leftRows: readonly Record<string, unknown>[],
  rightRows: readonly Record<string, unknown>[],
  columns: readonly string[],
  matchColumns: readonly string[],
): QueryDiffRow[] {
  const leftGroups = groupByKey(leftRows, matchColumns);
  const rightGroups = groupByKey(rightRows, matchColumns);
  const rows: QueryDiffRow[] = [];
  const seen = new Set<string>();

  for (const [key, leftGroup] of leftGroups) {
    seen.add(key);
    const rightGroup = rightGroups.get(key) ?? [];
    rows.push(...pairGroup(leftGroup, rightGroup, columns));
  }

  for (const [key, rightGroup] of rightGroups) {
    if (seen.has(key)) {
      continue;
    }
    rows.push(...pairGroup([], rightGroup, columns));
  }

  return rows;
}

function groupByKey(
  rows: readonly Record<string, unknown>[],
  matchColumns: readonly string[],
): Map<string, Record<string, unknown>[]> {
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const key = signature(row, matchColumns);
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }
  return groups;
}

function pairGroup(
  leftGroup: readonly Record<string, unknown>[],
  rightGroup: readonly Record<string, unknown>[],
  columns: readonly string[],
): QueryDiffRow[] {
  if (leftGroup.length !== 1 || rightGroup.length !== 1) {
    return [
      ...leftGroup.map((row) => ({
        status: "only-left" as const,
        values: project(row, columns),
        changes: {},
      })),
      ...rightGroup.map((row) => ({
        status: "only-right" as const,
        values: project(row, columns),
        changes: {},
      })),
    ];
  }

  const left = leftGroup[0]!;
  const right = rightGroup[0]!;
  if (signature(left, columns) === signature(right, columns)) {
    return [];
  }

  const changes: Record<string, QueryDiffChange> = {};
  for (const column of columns) {
    const leftValue = normalize(left[column]);
    const rightValue = normalize(right[column]);
    if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) {
      changes[column] = { left: leftValue, right: rightValue };
    }
  }

  return [
    {
      status: "changed",
      values: project(left, columns),
      changes,
    },
  ];
}
