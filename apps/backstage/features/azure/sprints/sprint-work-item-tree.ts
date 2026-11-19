import type { WorkItemSummary } from "@hrms/azure-devops";

/** Types that wrap nested children on the Sprints detail pane. */
const PARENT_TYPES = new Set([
  "Product Backlog Item",
  "Feature",
  "Epic",
  "User Story",
  "Issue",
  "Impediment",
]);

/**
 * Nested under a parent on Sprints. Tasks are intentionally omitted — Progress
 * owns task-level progress; this page is backlog-level (PBI / Bug / Feature).
 */
const CHILD_TYPES = new Set(["Bug"]);

export type SprintWorkItemTree = {
  item: WorkItemSummary;
  children: WorkItemSummary[];
  /** Set when a lone bug has a parent that is not in this sprint. */
  parent: WorkItemSummary | null;
};

export function isSprintParentType(type: string): boolean {
  return PARENT_TYPES.has(type);
}

export function isSprintChildType(type: string): boolean {
  return CHILD_TYPES.has(type);
}

function compareById(left: WorkItemSummary, right: WorkItemSummary): number {
  return left.id - right.id;
}

/**
 * Builds parent cards with nested Bugs for one sprint. Tasks are excluded.
 * Standalone Bugs (no resolvable parent in the set) appear as their own cards.
 */
export function buildSprintWorkItemTrees(
  workItems: readonly WorkItemSummary[],
): SprintWorkItemTree[] {
  const byId = new Map(workItems.map((item) => [item.id, item]));

  const childrenByParent = new Map<number, WorkItemSummary[]>();
  for (const item of workItems) {
    if (!isSprintChildType(item.type) || item.parentId == null) {
      continue;
    }
    const parent = byId.get(item.parentId);
    if (parent == null || !isSprintParentType(parent.type)) {
      continue;
    }
    const list = childrenByParent.get(parent.id) ?? [];
    list.push(item);
    childrenByParent.set(parent.id, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort(compareById);
  }

  const trees: SprintWorkItemTree[] = [];
  const nestedChildIds = new Set<number>();

  for (const item of [...workItems]
    .filter((entry) => isSprintParentType(entry.type))
    .sort(compareById)) {
    const children = childrenByParent.get(item.id) ?? [];
    for (const child of children) {
      nestedChildIds.add(child.id);
    }
    trees.push({ item, children, parent: null });
  }

  for (const item of [...workItems]
    .filter(
      (entry) => isSprintChildType(entry.type) && !nestedChildIds.has(entry.id),
    )
    .sort(compareById)) {
    const parent =
      item.parentId != null ? (byId.get(item.parentId) ?? null) : null;
    trees.push({
      item,
      children: [],
      parent: parent != null && isSprintParentType(parent.type) ? parent : null,
    });
  }

  return trees;
}
