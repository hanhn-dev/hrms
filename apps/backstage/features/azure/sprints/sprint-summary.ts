import type { WorkItemSummary } from "@hrms/azure-devops";
import type { SprintWorkItemTree } from "@/features/azure/sprints/sprint-work-item-tree";

export type SprintMissingEffortItem = {
  id: number;
  title: string;
  type: string;
  assignedTo: string | null;
};

export type SprintSummary = {
  pbiCount: number;
  bugCount: number;
  featureCount: number;
  totalEffort: number;
  missingEffort: SprintMissingEffortItem[];
};

function hasEffort(item: WorkItemSummary): boolean {
  return item.effort != null && item.effort > 0;
}

/** PBIs, Features, and standalone Bugs/Issues are expected to carry Effort. */
function expectsEffort(item: WorkItemSummary): boolean {
  return (
    item.type === "Product Backlog Item" ||
    item.type === "Feature" ||
    item.type === "Epic" ||
    item.type === "User Story" ||
    item.type === "Bug" ||
    item.type === "Issue" ||
    item.type === "Impediment"
  );
}

export function summarizeSprintTrees(
  trees: readonly SprintWorkItemTree[],
): SprintSummary {
  let pbiCount = 0;
  let bugCount = 0;
  let featureCount = 0;
  let totalEffort = 0;
  const missingEffort: SprintMissingEffortItem[] = [];

  for (const tree of trees) {
    const { item, children } = tree;

    if (item.type === "Product Backlog Item") {
      pbiCount += 1;
    } else if (item.type === "Feature") {
      featureCount += 1;
    } else if (item.type === "Bug") {
      bugCount += 1;
    }

    for (const child of children) {
      if (child.type === "Bug") {
        bugCount += 1;
      }
    }

    if (expectsEffort(item)) {
      if (hasEffort(item)) {
        totalEffort += item.effort ?? 0;
      } else {
        missingEffort.push({
          id: item.id,
          title: item.title,
          type: item.type,
          assignedTo: item.assignedTo,
        });
      }
    }
  }

  missingEffort.sort((left, right) => left.id - right.id);

  return {
    pbiCount,
    bugCount,
    featureCount,
    totalEffort,
    missingEffort,
  };
}
