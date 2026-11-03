import type { WorkflowLevel, WorkflowTree } from "@hrms/db/workflow-tree";

export function levelHasPeople(level: WorkflowLevel): boolean {
  return level.approvers.length > 0 || level.notifications.length > 0;
}

/** Pad empty steps up to the header count, and keep any later step that already has people. */
export function alignWorkflowLevels(tree: WorkflowTree, routingLevels: number): WorkflowTree {
  const minimum = Math.max(routingLevels, 1);
  const savedHighest = tree.levels.reduce((highest, level) => {
    if (level.level > highest && levelHasPeople(level)) {
      return level.level;
    }
    return highest;
  }, 0);
  const count = Math.max(minimum, savedHighest);
  const levels = Array.from({ length: count }, (_, index) => {
    const level = index + 1;
    return (
      tree.levels.find((item) => item.level === level) ?? {
        level,
        approvers: [],
        notifications: [],
      }
    );
  });
  return { ...tree, levels };
}

/** Steps past the header count are shown, and saving the path drops them. */
export function treeForSave(tree: WorkflowTree, routingLevels: number): WorkflowTree {
  const limit = Math.max(routingLevels, 1);
  return {
    ...tree,
    levels: tree.levels.filter((level) => level.level <= limit),
  };
}
