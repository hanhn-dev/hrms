import type { WorkItemSummary } from "@hrms/azure-devops";
import {
  allPersonItems,
  buildPersonWorkTrees,
  type PersonProgress,
  type WorkItemTree,
} from "@/features/azure/progress/aggregate-progress";

/** Ids on this card that are in the stale map, parent first, then children. */
export function treeStaleIds(
  tree: WorkItemTree,
  staleDaysById: ReadonlyMap<number, number | null>,
): number[] {
  const ids: number[] = [];
  if (staleDaysById.has(tree.item.id)) {
    ids.push(tree.item.id);
  }
  for (const child of tree.children) {
    if (staleDaysById.has(child.id)) {
      ids.push(child.id);
    }
  }
  return ids;
}

/** Parent cards wash amber when the parent or any nested task is stale. */
export function cardIsStale(
  tree: WorkItemTree,
  staleDaysById: ReadonlyMap<number, number | null>,
): boolean {
  return treeStaleIds(tree, staleDaysById).length > 0;
}

/**
 * Stale work item ids shown on this person's board, including tasks nested
 * under a parent they do not own.
 */
export function staleIdsForPerson(
  person: PersonProgress,
  allWorkItems: readonly WorkItemSummary[],
  staleDaysById: ReadonlyMap<number, number | null>,
): number[] {
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const tree of buildPersonWorkTrees(allPersonItems(person), allWorkItems)) {
    for (const id of treeStaleIds(tree, staleDaysById)) {
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
