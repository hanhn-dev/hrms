import type { SearchWorkItemsFilter } from "@hrms/azure-devops";

export function boardSearchFilter(
  iterationPath: string,
  search?: {
    query?: string;
    assignees?: readonly string[];
    types?: readonly string[];
  },
): SearchWorkItemsFilter | null {
  const query = search?.query?.trim() ?? "";
  if (query.length === 0) {
    return null;
  }
  const numericId = /^\d+$/.test(query) ? Number(query) : null;
  return {
    iteration: iterationPath,
    top: 50,
    ...(numericId !== null && Number.isSafeInteger(numericId)
      ? { ids: [numericId] }
      : { titleContains: query }),
    assignees: search?.assignees,
    types: search?.types,
  };
}
