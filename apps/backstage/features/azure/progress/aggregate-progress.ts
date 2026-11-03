import type { TeamIteration, WorkItemSummary } from "@hrms/azure-devops";

export const UNASSIGNED_LABEL = "Unassigned";

const COMPLETED_STATES = new Set(["done", "closed", "resolved"]);

export function isCompletedState(state: string): boolean {
  return COMPLETED_STATES.has(state.trim().toLowerCase());
}

export type PersonProgress = {
  displayName: string;
  active: number;
  completed: number;
  total: number;
  /** 0–100; 0 when there are no items. */
  progressPercent: number;
  /** Count of work items in each Azure DevOps state. */
  stateCounts: Readonly<Record<string, number>>;
  activeItems: WorkItemSummary[];
  completedItems: WorkItemSummary[];
};

/** Preferred column order for known sprint states; unknown states sort after these. */
export const STATE_COLUMN_ORDER = [
  "New",
  "Approved",
  "Committed",
  "To Do",
  "In Progress",
  "Active",
  "Resolved",
  "Done",
  "Closed",
  "Blocked",
] as const;

/** States that never appear as people-board columns. */
export const HIDDEN_STATE_COLUMNS = new Set(["Removed", "Design"]);

export function allPersonItems(person: PersonProgress): WorkItemSummary[] {
  return [...person.activeItems, ...person.completedItems];
}

const CHILD_TYPES = new Set(["Task", "Bug"]);

/** Parents that can wrap Tasks/Bugs (PBI, Feature, User Story, …). */
function isNestableParent(item: WorkItemSummary): boolean {
  return !CHILD_TYPES.has(item.type);
}

export type WorkItemTree = {
  item: WorkItemSummary;
  children: WorkItemSummary[];
  /**
   * Parent stub when this item is a lone child whose parent could not be
   * loaded (so no wrapper card is possible).
   */
  parent: WorkItemSummary | null;
};

/**
 * Builds parent/child trees for one person.
 *
 * - Owned nestable parents (usually PBIs) wrap every sprint child under them.
 * - Tasks/Bugs under a parent assigned to someone else still wrap under that
 *   parent, but only with this person's children — multi-assignee safe.
 * - Children with no resolvable parent stay as root cards (with a parent stub
 *   when the parent row exists).
 */
export function buildPersonWorkTrees(
  personItems: readonly WorkItemSummary[],
  allSprintItems: readonly WorkItemSummary[],
): WorkItemTree[] {
  const allById = new Map(allSprintItems.map((item) => [item.id, item]));

  const childrenByParent = new Map<number, WorkItemSummary[]>();
  for (const item of allSprintItems) {
    if (item.parentId == null || !CHILD_TYPES.has(item.type)) {
      continue;
    }
    const parent = allById.get(item.parentId);
    if (parent == null || !isNestableParent(parent)) {
      continue;
    }
    const list = childrenByParent.get(parent.id) ?? [];
    list.push(item);
    childrenByParent.set(parent.id, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort((left, right) => left.id - right.id);
  }

  const ownedParentIds = new Set(
    personItems.filter((item) => isNestableParent(item)).map((item) => item.id),
  );

  const personChildrenByParent = new Map<number, WorkItemSummary[]>();
  const unresolvedRoots: WorkItemSummary[] = [];

  for (const item of personItems) {
    if (isNestableParent(item)) {
      continue;
    }
    if (!CHILD_TYPES.has(item.type) || item.parentId == null) {
      unresolvedRoots.push(item);
      continue;
    }
    const parent = allById.get(item.parentId);
    if (parent == null || !isNestableParent(parent)) {
      unresolvedRoots.push(item);
      continue;
    }
    const list = personChildrenByParent.get(parent.id) ?? [];
    list.push(item);
    personChildrenByParent.set(parent.id, list);
  }
  for (const list of personChildrenByParent.values()) {
    list.sort((left, right) => left.id - right.id);
  }

  const trees: WorkItemTree[] = [];

  for (const item of [...personItems]
    .filter((entry) => isNestableParent(entry))
    .sort((left, right) => left.id - right.id)) {
    trees.push({
      item,
      children: childrenByParent.get(item.id) ?? [],
      parent: null,
    });
  }

  const sharedParentIds = [...personChildrenByParent.keys()]
    .filter((parentId) => !ownedParentIds.has(parentId))
    .sort((left, right) => left - right);
  for (const parentId of sharedParentIds) {
    const parent = allById.get(parentId);
    if (parent == null) {
      continue;
    }
    trees.push({
      item: parent,
      children: personChildrenByParent.get(parentId) ?? [],
      parent: null,
    });
  }

  for (const item of unresolvedRoots.sort((left, right) => left.id - right.id)) {
    const parent =
      item.parentId != null ? (allById.get(item.parentId) ?? null) : null;
    trees.push({
      item,
      children: [],
      parent: parent != null && isNestableParent(parent) ? parent : null,
    });
  }

  return trees;
}

function stateRank(state: string): number {
  const index = STATE_COLUMN_ORDER.indexOf(
    state as (typeof STATE_COLUMN_ORDER)[number],
  );
  return index === -1 ? STATE_COLUMN_ORDER.length : index;
}

/**
 * Column state for a people-board card. PBIs with child Tasks/Bugs use the
 * furthest active child state (so an In Progress task pulls a Committed PBI
 * into In Progress). When every child is completed, the furthest completed
 * child state wins. Leaf cards use their own state.
 */
export function treeBoardState(tree: WorkItemTree): string {
  const rootState = tree.item.state.trim() || "Unknown";
  if (tree.children.length === 0) {
    return rootState;
  }
  const childStates = tree.children.map(
    (child) => child.state.trim() || "Unknown",
  );
  const active = childStates.filter((state) => !isCompletedState(state));
  const pool = active.length > 0 ? active : childStates;
  let best = pool[0] ?? rootState;
  for (const state of pool) {
    if (stateRank(state) > stateRank(best)) {
      best = state;
    }
  }
  return best;
}

/** Groups a person's work trees by {@link treeBoardState} for board columns. */
export function treesByState(
  trees: readonly WorkItemTree[],
): Map<string, WorkItemTree[]> {
  const grouped = new Map<string, WorkItemTree[]>();
  for (const tree of trees) {
    const state = treeBoardState(tree);
    if (HIDDEN_STATE_COLUMNS.has(state)) {
      continue;
    }
    const list = grouped.get(state) ?? [];
    list.push(tree);
    grouped.set(state, list);
  }
  return grouped;
}

/** Distinct states across rows, ordered for status columns. */
export function collectStateColumns(rows: readonly PersonProgress[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    for (const state of Object.keys(row.stateCounts)) {
      const trimmed = state.trim();
      if (trimmed.length === 0 || HIDDEN_STATE_COLUMNS.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
    }
  }
  const known = STATE_COLUMN_ORDER.filter((state) => seen.has(state));
  for (const state of known) {
    seen.delete(state);
  }
  const extras = [...seen].sort((left, right) => left.localeCompare(right));
  return [...known, ...extras];
}

export type VelocityCell = {
  displayName: string;
  iterationPath: string;
  iterationName: string;
  completed: number;
};

export type VelocitySeries = {
  iterations: readonly { path: string; name: string }[];
  members: readonly string[];
  /** member displayName → iterationPath → completed count */
  counts: ReadonlyMap<string, ReadonlyMap<string, number>>;
  cells: readonly VelocityCell[];
};

function emptyPerson(displayName: string): PersonProgress {
  return {
    displayName,
    active: 0,
    completed: 0,
    total: 0,
    progressPercent: 0,
    stateCounts: {},
    activeItems: [],
    completedItems: [],
  };
}

function bumpStateCount(
  counts: Record<string, number>,
  state: string,
): Record<string, number> {
  const key = state.trim() || "Unknown";
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

function finalizePerson(person: PersonProgress): PersonProgress {
  const total = person.active + person.completed;
  return {
    ...person,
    total,
    progressPercent: total === 0 ? 0 : Math.round((person.completed / total) * 100),
  };
}

/**
 * Groups sprint work items by assignee display name. Unassigned items use
 * {@link UNASSIGNED_LABEL}. Roster names with no items still appear when listed
 * in `rosterOrder`.
 */
export function groupByAssignee(
  workItems: readonly WorkItemSummary[],
  rosterOrder: readonly string[] = [],
): PersonProgress[] {
  const byName = new Map<string, PersonProgress>();

  for (const name of rosterOrder) {
    const trimmed = name.trim();
    if (trimmed.length === 0 || byName.has(trimmed)) {
      continue;
    }
    byName.set(trimmed, emptyPerson(trimmed));
  }

  for (const item of workItems) {
    const displayName = item.assignedTo?.trim() || UNASSIGNED_LABEL;
    let person = byName.get(displayName);
    if (person == null) {
      person = emptyPerson(displayName);
      byName.set(displayName, person);
    }
    person.stateCounts = bumpStateCount(
      person.stateCounts as Record<string, number>,
      item.state,
    );
    if (isCompletedState(item.state)) {
      person.completedItems.push(item);
      person.completed += 1;
    } else {
      person.activeItems.push(item);
      person.active += 1;
    }
  }

  const ordered: PersonProgress[] = [];
  const seen = new Set<string>();
  for (const name of rosterOrder) {
    const trimmed = name.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    const person = byName.get(trimmed);
    if (person != null) {
      ordered.push(finalizePerson(person));
      seen.add(trimmed);
    }
  }

  const extras = [...byName.keys()]
    .filter((name) => !seen.has(name) && name !== UNASSIGNED_LABEL)
    .sort((left, right) => left.localeCompare(right));
  for (const name of extras) {
    ordered.push(finalizePerson(byName.get(name)!));
    seen.add(name);
  }

  const unassigned = byName.get(UNASSIGNED_LABEL);
  if (unassigned != null && !seen.has(UNASSIGNED_LABEL)) {
    ordered.push(finalizePerson(unassigned));
  }

  return ordered;
}

/**
 * When `selectedDisplayNames` is non-empty, keep only those people (in selection
 * order). Otherwise keep the full grouped list. Unassigned is dropped while a
 * tracking list is active.
 */
export function filterMembers(
  rows: readonly PersonProgress[],
  selectedDisplayNames: readonly string[],
): PersonProgress[] {
  const selected = selectedDisplayNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (selected.length === 0) {
    return [...rows];
  }
  const byName = new Map(rows.map((row) => [row.displayName, row]));
  const result: PersonProgress[] = [];
  const seen = new Set<string>();
  for (const name of selected) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(byName.get(name) ?? finalizePerson(emptyPerson(name)));
  }
  return result;
}

export const VELOCITY_PAST_SPRINT_LIMIT = 6;

/** Current sprint (if any) plus up to {@link VELOCITY_PAST_SPRINT_LIMIT} past sprints, oldest first. */
export function pickVelocityIterations(
  iterations: readonly TeamIteration[],
): TeamIteration[] {
  const current = iterations.find((item) => item.timeFrame === "current") ?? null;
  const past = iterations
    .filter((item) => item.timeFrame === "past")
    .slice(0, VELOCITY_PAST_SPRINT_LIMIT)
    .reverse();
  if (current == null) {
    return past;
  }
  return [...past, current];
}

export function buildVelocitySeries(
  iterations: readonly TeamIteration[],
  itemsByIterationPath: ReadonlyMap<string, readonly WorkItemSummary[]>,
  selectedMembers: readonly string[] = [],
): VelocitySeries {
  const orderedIterations = pickVelocityIterations(iterations);
  const iterationMeta = orderedIterations.map((item) => ({
    path: item.path,
    name: item.name,
  }));

  const selected = selectedMembers
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  const memberSet = new Set<string>(selected);
  if (selected.length === 0) {
    for (const iteration of orderedIterations) {
      const items = itemsByIterationPath.get(iteration.path) ?? [];
      for (const item of items) {
        if (isCompletedState(item.state)) {
          const name = item.assignedTo?.trim();
          if (name) {
            memberSet.add(name);
          }
        }
      }
    }
  }

  const members =
    selected.length > 0
      ? [...new Set(selected)]
      : [...memberSet].sort((left, right) => left.localeCompare(right));

  const counts = new Map<string, Map<string, number>>();
  for (const member of members) {
    counts.set(member, new Map(iterationMeta.map((iteration) => [iteration.path, 0])));
  }

  const cells: VelocityCell[] = [];
  for (const iteration of orderedIterations) {
    const items = itemsByIterationPath.get(iteration.path) ?? [];
    for (const item of items) {
      if (!isCompletedState(item.state)) {
        continue;
      }
      const name = item.assignedTo?.trim();
      if (name == null || name.length === 0) {
        continue;
      }
      if (selected.length > 0 && !memberSet.has(name)) {
        continue;
      }
      let memberCounts = counts.get(name);
      if (memberCounts == null) {
        memberCounts = new Map(iterationMeta.map((entry) => [entry.path, 0]));
        counts.set(name, memberCounts);
      }
      const next = (memberCounts.get(iteration.path) ?? 0) + 1;
      memberCounts.set(iteration.path, next);
    }
  }

  for (const member of members) {
    const memberCounts = counts.get(member)!;
    for (const iteration of iterationMeta) {
      cells.push({
        displayName: member,
        iterationPath: iteration.path,
        iterationName: iteration.name,
        completed: memberCounts.get(iteration.path) ?? 0,
      });
    }
  }

  return { iterations: iterationMeta, members, counts, cells };
}

/**
 * When `selectedDisplayNames` is non-empty, keep only those people (in selection
 * order). Otherwise return the series unchanged. Missing members get zero counts.
 */
export function filterVelocitySeries(
  series: VelocitySeries,
  selectedDisplayNames: readonly string[],
): VelocitySeries {
  const selected = selectedDisplayNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (selected.length === 0) {
    return series;
  }
  const members: string[] = [];
  const seen = new Set<string>();
  for (const name of selected) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    members.push(name);
  }
  const counts = new Map<string, ReadonlyMap<string, number>>();
  const cells: VelocityCell[] = [];
  for (const member of members) {
    const existing = series.counts.get(member);
    const memberCounts =
      existing ??
      new Map(series.iterations.map((iteration) => [iteration.path, 0] as const));
    counts.set(member, memberCounts);
    for (const iteration of series.iterations) {
      cells.push({
        displayName: member,
        iterationPath: iteration.path,
        iterationName: iteration.name,
        completed: memberCounts.get(iteration.path) ?? 0,
      });
    }
  }
  return { iterations: series.iterations, members, counts, cells };
}
