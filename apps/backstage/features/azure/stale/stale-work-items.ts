import type { WorkItemStateAge, WorkItemSummary } from "@hrms/azure-devops";
import type { StaleDays } from "@/features/azure/stale/stale-days-preference";

const COMPLETED_STATES = new Set(["done", "closed", "resolved"]);

export function isCompletedState(state: string): boolean {
  return COMPLETED_STATES.has(state.trim().toLowerCase());
}

export function isBlockedState(state: string): boolean {
  return state.trim().toLowerCase() === "blocked";
}

export type StaleReason = "stale" | "blocked";

export type StaleWorkItem = {
  readonly item: WorkItemSummary;
  readonly assignee: string;
  readonly daysInState: number | null;
  readonly reason: StaleReason;
};

export type StaleAssigneeGroup = {
  readonly assignee: string;
  readonly items: readonly StaleWorkItem[];
};

export function collectActiveWorkItemIds(items: readonly WorkItemSummary[]): number[] {
  return [
    ...new Set(
      items.filter((item) => !isCompletedState(item.state)).map((item) => item.id),
    ),
  ];
}

export function findStaleWorkItems(
  items: readonly WorkItemSummary[],
  ages: ReadonlyMap<number, WorkItemStateAge>,
  staleDays: StaleDays,
): StaleWorkItem[] {
  const stale: StaleWorkItem[] = [];
  for (const item of items) {
    if (isCompletedState(item.state)) {
      continue;
    }
    const age = ages.get(item.id);
    const daysInState = age?.daysInState ?? null;
    const blocked = isBlockedState(item.state);
    const overThreshold = daysInState != null && daysInState >= staleDays;
    if (!blocked && !overThreshold) {
      continue;
    }
    stale.push({
      item,
      assignee: item.assignedTo?.trim() || "Unassigned",
      daysInState,
      reason: blocked ? "blocked" : "stale",
    });
  }
  stale.sort((left, right) => {
    const dayDiff = (right.daysInState ?? -1) - (left.daysInState ?? -1);
    if (dayDiff !== 0) {
      return dayDiff;
    }
    return left.item.id - right.item.id;
  });
  return stale;
}

export function groupStaleByAssignee(items: readonly StaleWorkItem[]): StaleAssigneeGroup[] {
  const byAssignee = new Map<string, StaleWorkItem[]>();
  for (const entry of items) {
    const list = byAssignee.get(entry.assignee) ?? [];
    list.push(entry);
    byAssignee.set(entry.assignee, list);
  }
  return [...byAssignee.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([assignee, groupItems]) => ({ assignee, items: groupItems }));
}

export function buildReminderText(group: StaleAssigneeGroup): string {
  const parts = group.items.map((entry) => {
    const days =
      entry.daysInState == null ? "unknown age" : `${entry.daysInState}d`;
    return `#${entry.item.id} (${entry.item.state}, ${days})`;
  });
  return `Hi ${group.assignee} — please update or move these items still in the same status: ${parts.join(", ")}`;
}

export function staleDaysById(items: readonly StaleWorkItem[]): ReadonlyMap<number, number | null> {
  return new Map(items.map((entry) => [entry.item.id, entry.daysInState]));
}
