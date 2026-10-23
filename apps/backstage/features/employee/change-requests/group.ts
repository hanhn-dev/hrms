import type { ChangeRequestListItem } from "@hrms/db";

export const NO_WORKFLOW_LABEL = "No workflow";

export type ChangeRequestWorkflowGroup = {
  key: string;
  workflowId: number | null;
  workflowName: string;
  requests: ChangeRequestListItem[];
  pendingCount: number;
  workflowIsDefault: boolean;
  workflowAllLocations: boolean;
  workflowAllBusinessUnits: boolean;
  workflowLocationNames: string | null;
  workflowBusinessUnitNames: string | null;
  workflowCreatedDate: string | null;
};

function workflowScope(request: ChangeRequestListItem) {
  return {
    workflowIsDefault: request.workflowIsDefault,
    workflowAllLocations: request.workflowAllLocations,
    workflowAllBusinessUnits: request.workflowAllBusinessUnits,
    workflowLocationNames: request.workflowLocationNames,
    workflowBusinessUnitNames: request.workflowBusinessUnitNames,
    workflowCreatedDate: request.workflowCreatedDate,
  };
}

export function requestCountLabel(count: number): string {
  return `${count} ${count === 1 ? "request" : "requests"}`;
}

function trimmed(value: string | null): string | null {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

export function groupChangeRequestsByWorkflow(
  requests: ChangeRequestListItem[],
): ChangeRequestWorkflowGroup[] {
  const buckets = new Map<string, ChangeRequestWorkflowGroup>();
  for (const request of requests) {
    const named = request.workflowName?.trim() ?? "";
    const workflowName = named || NO_WORKFLOW_LABEL;
    const workflowId = named ? request.workflowId : null;
    const key =
      workflowId != null
        ? `id:${workflowId}`
        : `name:${workflowName.toLowerCase()}`;
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
      ...workflowScope(request),
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

/**
 * Extra label for a repeated workflow name: locations, business units, or Default.
 * When none of those are set, the workflow's created date keeps the sections apart.
 */
export function workflowGroupCaption(
  group: ChangeRequestWorkflowGroup,
  groups: ChangeRequestWorkflowGroup[],
  createdLabel: string | null,
): string | null {
  const name = group.workflowName.trim().toLowerCase();
  const shared =
    groups.filter((item) => item.workflowName.trim().toLowerCase() === name)
      .length > 1;
  if (!shared) {
    return null;
  }
  const parts: string[] = [];
  const locations = trimmed(group.workflowLocationNames);
  const units = trimmed(group.workflowBusinessUnitNames);
  if (locations) {
    parts.push(locations);
  } else if (group.workflowAllLocations) {
    parts.push("All locations");
  }
  if (units) {
    parts.push(units);
  } else if (group.workflowAllBusinessUnits) {
    parts.push("All business units");
  }
  if (group.workflowIsDefault) {
    parts.push("Default");
  }
  if (parts.length === 0) {
    const created = createdLabel?.trim() ?? "";
    if (created.length > 0 && created !== "—") {
      parts.push(`Created ${created}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
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
