import type { PendingInboxCategory } from "@/features/employer/notifications/queries";
import { formatRequestTypeLabel } from "@/features/employer/notifications/format-request-type-label";

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

/** Keep categories/types whose name or request type matches a local search box. */
export function filterInboxCategories(
  categories: PendingInboxCategory[],
  query: string,
): PendingInboxCategory[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return categories;
  }

  const next: PendingInboxCategory[] = [];
  for (const category of categories) {
    if (matchesQuery(category.name, needle)) {
      next.push(category);
      continue;
    }
    const types = category.types.filter((item) => {
      return (
        matchesQuery(item.requestType, needle) ||
        matchesQuery(formatRequestTypeLabel(item.requestType), needle)
      );
    });
    if (types.length === 0) {
      continue;
    }
    next.push({
      name: category.name,
      total: category.total,
      types,
    });
  }
  return next;
}
