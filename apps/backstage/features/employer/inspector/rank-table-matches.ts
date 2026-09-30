export type TableNameRef = {
  schema: string;
  name: string;
};

function tableNameRank(name: string, query: string): number {
  const normalized = name.toLowerCase();
  if (normalized === query) {
    return 0;
  }
  if (normalized.startsWith(query)) {
    return 1;
  }
  const segments = normalized.split("_");
  if (segments.some((segment) => segment === query)) {
    return 2;
  }
  if (segments.some((segment) => segment.startsWith(query))) {
    return 3;
  }
  if (normalized.includes(query)) {
    return 4;
  }
  return 5;
}

function matchesQuery(table: TableNameRef, query: string): boolean {
  const name = table.name.toLowerCase();
  const qualified = `${table.schema}.${table.name}`.toLowerCase();
  return name.includes(query) || qualified.includes(query);
}

export function rankTableMatches<T extends TableNameRef>(
  tables: readonly T[],
  query: string,
  limit: number,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0 || limit <= 0) {
    return [];
  }

  return tables
    .filter((table) => matchesQuery(table, normalized))
    .sort((left, right) => {
      const rankDelta =
        tableNameRank(left.name, normalized) - tableNameRank(right.name, normalized);
      if (rankDelta !== 0) {
        return rankDelta;
      }
      const lengthDelta = left.name.length - right.name.length;
      if (lengthDelta !== 0) {
        return lengthDelta;
      }
      const nameDelta = left.name.localeCompare(right.name);
      if (nameDelta !== 0) {
        return nameDelta;
      }
      return left.schema.localeCompare(right.schema);
    })
    .slice(0, limit);
}
