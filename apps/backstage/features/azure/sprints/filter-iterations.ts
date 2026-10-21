import type { TeamIteration, TeamIterationTimeframe } from "@hrms/azure-devops";

export type IterationClientFilters = {
  timeFrame?: TeamIterationTimeframe | null;
  from?: string | null;
  to?: string | null;
  path?: string | null;
  q?: string | null;
};

/**
 * Parent path prefixes for a sprint path (excludes the leaf name).
 * `Project\\Release 2\\Sprint 1` → `["Project", "Project\\Release 2"]`
 */
export function parentPathPrefixes(iterationPath: string): string[] {
  const segments = iterationPath.split("\\").filter((segment) => segment.length > 0);
  if (segments.length < 2) {
    return [];
  }

  const prefixes: string[] = [];
  for (let index = 1; index < segments.length; index += 1) {
    prefixes.push(segments.slice(0, index).join("\\"));
  }
  return prefixes;
}

/** Unique parent path prefixes across iterations, sorted. */
export function iterationPathPrefixes(iterations: readonly TeamIteration[]): string[] {
  const prefixes = new Set<string>();
  for (const iteration of iterations) {
    for (const prefix of parentPathPrefixes(iteration.path)) {
      prefixes.add(prefix);
    }
  }
  return [...prefixes].sort((left, right) => left.localeCompare(right));
}

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function overlapsDateRange(
  startDate: string | null,
  finishDate: string | null,
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  const hasFrom = from != null && from.length > 0;
  const hasTo = to != null && to.length > 0;
  if (!hasFrom && !hasTo) {
    return true;
  }

  // No dates on the iteration — only keep when no range is set (handled above).
  if (startDate == null && finishDate == null) {
    return false;
  }

  const rangeStart = hasFrom ? toDateOnly(from) : null;
  const rangeEnd = hasTo ? toDateOnly(to) : null;
  const sprintStart = toDateOnly(startDate ?? finishDate!);
  const sprintEnd = toDateOnly(finishDate ?? startDate!);

  if (rangeEnd != null && sprintStart > rangeEnd) {
    return false;
  }
  if (rangeStart != null && sprintEnd < rangeStart) {
    return false;
  }
  return true;
}

function matchesPathPrefix(iterationPath: string, pathPrefix: string | null | undefined): boolean {
  if (pathPrefix == null || pathPrefix.length === 0) {
    return true;
  }
  return iterationPath === pathPrefix || iterationPath.startsWith(`${pathPrefix}\\`);
}

function matchesName(name: string, q: string | null | undefined): boolean {
  if (q == null || q.trim().length === 0) {
    return true;
  }
  return name.toLowerCase().includes(q.trim().toLowerCase());
}

function matchesTimeFrame(
  timeFrame: TeamIteration["timeFrame"],
  filter: TeamIterationTimeframe | null | undefined,
): boolean {
  if (filter == null) {
    return true;
  }
  return timeFrame === filter;
}

export function filterIterations(
  iterations: readonly TeamIteration[],
  filters: IterationClientFilters,
): TeamIteration[] {
  return iterations.filter(
    (iteration) =>
      matchesTimeFrame(iteration.timeFrame, filters.timeFrame) &&
      overlapsDateRange(iteration.startDate, iteration.finishDate, filters.from, filters.to) &&
      matchesPathPrefix(iteration.path, filters.path) &&
      matchesName(iteration.name, filters.q),
  );
}
