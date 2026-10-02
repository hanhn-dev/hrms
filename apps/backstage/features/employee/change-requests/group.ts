import type { ChangeRequestListItem } from "@hrms/db";

export const NO_WORKFLOW_LABEL = "No workflow";

export type ChangeRequestWorkflowGroup = {
  key: string;
  workflowId: number | null;
  workflowName: string;
  requests: ChangeRequestListItem[];
  pendingCount: number;
};

export function groupChangeRequestsByWorkflow(
  requests: ChangeRequestListItem[],
): ChangeRequestWorkflowGroup[] {
  const buckets = new Map<string, ChangeRequestWorkflowGroup>();
  for (const request of requests) {
    const named = request.workflowName?.trim() ?? "";
    const workflowName = named || NO_WORKFLOW_LABEL;
    const workflowId = named ? request.workflowId : null;
    const key =
      workflowId != null ? `id:${workflowId}` : `name:${workflowName.toLowerCase()}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.requests.push(request);
      if (request.status === "pending") {
        existing.pendingCount += 1;
      }
      continue;
    }
    buckets.set(key, {
      key,
      workflowId,
      workflowName,
      requests: [request],
      pendingCount: request.status === "pending" ? 1 : 0,
    });
  }

  return [...buckets.values()].sort((left, right) => {
    const leftPending = left.pendingCount > 0 ? 0 : 1;
    const rightPending = right.pendingCount > 0 ? 0 : 1;
    if (leftPending !== rightPending) {
      return leftPending - rightPending;
    }
    return left.workflowName.localeCompare(right.workflowName);
  });
}

/** Groups that still have pending requests stay open. Otherwise every group is open. */
export function expandedWorkflowGroupKeys(
  groups: ChangeRequestWorkflowGroup[],
): string[] {
  const pending = groups
    .filter((group) => group.pendingCount > 0)
    .map((group) => group.key);
  if (pending.length > 0) {
    return pending;
  }
  return groups.map((group) => group.key);
}
