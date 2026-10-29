import type {
  ChangeRequestListItem,
  ChangeRequestWorkflowCount,
} from "@hrms/db";

export const NO_WORKFLOW_LABEL = "No workflow";

export const STATUS_TAB_LABEL = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
} as const;

export type ChangeRequestStatusTab = keyof typeof STATUS_TAB_LABEL;

export type ChangeRequestWorkflowGroup = {
  key: string;
  workflowId: number | null;
  workflowName: string;
  requests: ChangeRequestListItem[];
  /** Rows in this group on the current page, until database counts replace it. */
  requestCount: number;
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

export function statusTabLabel(status: ChangeRequestStatusTab, count: number): string {
  return `${STATUS_TAB_LABEL[status]} ${count}`;
}

/** The pending badge is the database total, and only on the All tab. */
export function showWorkflowPendingTag(
  status: ChangeRequestStatusTab,
  pendingCount: number,
): boolean {
  return status === "all" && pendingCount > 0;
}

export function workflowGroupKey(
  workflowId: number | null,
  workflowName: string | null,
): { key: string; workflowId: number | null; workflowName: string } {
  const named = workflowName?.trim() ?? "";
  const label = named || NO_WORKFLOW_LABEL;
  const id = named ? workflowId : null;
  return {
    key: id != null ? `id:${id}` : `name:${label.toLowerCase()}`,
    workflowId: id,
    workflowName: label,
  };
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
    const identity = workflowGroupKey(request.workflowId, request.workflowName);
    const existing = buckets.get(identity.key);
    if (existing) {
      existing.requests.push(request);
      existing.requestCount += 1;
      if (request.status === "pending") {
        existing.pendingCount += 1;
      }
      continue;
    }
    buckets.set(identity.key, {
      key: identity.key,
      workflowId: identity.workflowId,
      workflowName: identity.workflowName,
      requests: [request],
      requestCount: 1,
      pendingCount: request.status === "pending" ? 1 : 0,
      ...workflowScope(request),
    });
  }

  return [...buckets.values()].sort(compareWorkflowGroups);
}

/**
 * Replace page-sized badges with the database totals for the same workflow.
 * Groups that still have pending requests in the database sort first.
 */
export function applyWorkflowCounts(
  groups: ChangeRequestWorkflowGroup[],
  counts: readonly ChangeRequestWorkflowCount[],
): ChangeRequestWorkflowGroup[] {
  const totals = new Map<string, { requestCount: number; pendingCount: number }>();
  for (const count of counts) {
    const identity = workflowGroupKey(count.workflowId, count.workflowName);
    const existing = totals.get(identity.key);
    if (existing) {
      existing.requestCount += count.requestCount;
      existing.pendingCount += count.pendingCount;
      continue;
    }
    totals.set(identity.key, {
      requestCount: count.requestCount,
      pendingCount: count.pendingCount,
    });
  }
  return groups
    .map((group) => {
      const total = totals.get(group.key);
      if (!total) {
        return group;
      }
      return {
        ...group,
        requestCount: total.requestCount,
        pendingCount: total.pendingCount,
      };
    })
    .sort(compareWorkflowGroups);
}

function compareWorkflowGroups(
  left: ChangeRequestWorkflowGroup,
  right: ChangeRequestWorkflowGroup,
): number {
  const leftPending = left.pendingCount > 0 ? 0 : 1;
  const rightPending = right.pendingCount > 0 ? 0 : 1;
  if (leftPending !== rightPending) {
    return leftPending - rightPending;
  }
  return left.workflowName.localeCompare(right.workflowName);
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
