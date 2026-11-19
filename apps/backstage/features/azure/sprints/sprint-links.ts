/** Last segment of an Azure iteration path (`Project\\Sprint 64` → `Sprint 64`). */
export function iterationLeafName(iterationPath: string): string {
  const segments = iterationPath.split("\\").filter((segment) => segment.length > 0);
  return segments.at(-1) ?? iterationPath;
}

function appendFilterParams(
  params: URLSearchParams,
  filterQuery?: Record<string, string | undefined>,
): void {
  if (!filterQuery) {
    return;
  }
  for (const [key, value] of Object.entries(filterQuery)) {
    if (value != null && value.length > 0) {
      params.set(key, value);
    }
  }
}

export function boardHref(iterationPath: string, teamName: string): string {
  const params = new URLSearchParams();
  if (teamName.length > 0) {
    params.set("team", teamName);
  }
  params.set("iteration", iterationPath);
  return `/azure/board?${params.toString()}`;
}

export function sprintHref(
  iterationPath: string,
  filterQuery?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  appendFilterParams(params, filterQuery);
  params.set("iteration", iterationPath);
  const query = params.toString();
  return query
    ? `/azure/sprints?${query}`
    : `/azure/sprints?iteration=${encodeURIComponent(iterationPath)}`;
}

/** Sprints list URL with filters preserved and iteration selection cleared. */
export function sprintsClearHref(
  filterQuery?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  appendFilterParams(params, filterQuery);
  const query = params.toString();
  return query ? `/azure/sprints?${query}` : "/azure/sprints";
}
