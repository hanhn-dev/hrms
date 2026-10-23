import type {
  TaskboardColumn,
  TaskboardWorkItemColumn,
  TeamMember,
  WorkItemSummary,
} from "@hrms/azure-devops";

export const UNMAPPED_COLUMN_ID = "unmapped";
export const UNMAPPED_COLUMN_NAME = "Unmapped";

const STATE_ORDER = [
  "New",
  "Approved",
  "Committed",
  "To Do",
  "In Progress",
  "Resolved",
  "Done",
  "Closed",
  "Removed",
];

function stateColumns(workItems: readonly WorkItemSummary[]): TaskboardColumn[] {
  const states = [
    ...new Set(
      workItems.map((item) => item.state.trim()).filter((state) => state.length > 0),
    ),
  ];
  states.sort((left, right) => {
    const leftRank = STATE_ORDER.indexOf(left);
    const rightRank = STATE_ORDER.indexOf(right);
    const leftOrder = leftRank === -1 ? STATE_ORDER.length : leftRank;
    const rightOrder = rightRank === -1 ? STATE_ORDER.length : rightRank;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right);
  });
  return states.map((state, index) => ({
    id: `state:${state}`,
    name: state,
    order: index,
    mappings: [],
  }));
}

const PBI_TYPE = "Product Backlog Item";
const CHILD_TYPES = new Set(["Task", "Bug"]);
const MIN_TOKEN_LENGTH = 2;

export type BoardRelation = {
  id: number;
  title: string | null;
  url: string;
  type: string | null;
  state: string | null;
  assignedTo: string | null;
};

export type BoardChild = {
  id: number;
  title: string;
  url: string;
  type: string;
  state: string;
  columnName: string;
};

export type BoardCard = {
  item: WorkItemSummary;
  parentTitle: string | null;
  parent: BoardRelation | null;
  children: BoardChild[];
  columnId: string;
  columnName: string;
};

export type BoardColumnView = {
  id: string;
  name: string;
  order: number;
  cards: BoardCard[];
};

export type PersonPbi = {
  id: number;
  title: string;
  url: string;
};

export type PersonWork = {
  displayName: string;
  pbis: PersonPbi[];
  cards: BoardCard[];
};

export type MemberPbiAnswer = {
  displayName: string;
  pbis: PersonPbi[];
};

export type SprintSummary = {
  total: number;
  tasks: number;
  bugs: number;
  pbis: number;
  other: number;
};

export type BoardModel = {
  columns: BoardColumnView[];
  people: PersonWork[];
  memberAnswers: MemberPbiAnswer[];
};

export type GroupBoardInput = {
  workItems: readonly WorkItemSummary[];
  columns: readonly TaskboardColumn[];
  placements: readonly TaskboardWorkItemColumn[];
  members: readonly TeamMember[];
  assignees?: readonly string[];
  types?: readonly string[];
  parents?: readonly WorkItemSummary[];
  query?: string | null;
};

function searchTokens(query: string | null | undefined): string[] {
  if (query == null || query.trim().length === 0) {
    return [];
  }
  return [
    ...new Set(
      query
        .trim()
        .split(/\s+/)
        .filter((token) => token.length >= MIN_TOKEN_LENGTH)
        .map((token) => token.toLowerCase()),
    ),
  ];
}

function namesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = left?.trim().toLowerCase() ?? "";
  const normalizedRight = right?.trim().toLowerCase() ?? "";
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

function haystack(item: WorkItemSummary, parentTitle: string | null): string {
  return [String(item.id), item.title, item.assignedTo ?? "", parentTitle ?? ""]
    .join(" ")
    .toLowerCase();
}

function matchesQuery(item: WorkItemSummary, parentTitle: string | null, tokens: readonly string[]): boolean {
  if (tokens.length === 0) {
    return true;
  }
  const text = haystack(item, parentTitle);
  return tokens.every((token) => text.includes(token));
}

function parentOf(
  item: WorkItemSummary,
  itemsById: ReadonlyMap<number, WorkItemSummary>,
): { parentTitle: string | null; parent: BoardRelation | null } {
  if (item.parentId == null) {
    return { parentTitle: null, parent: null };
  }
  const loaded = itemsById.get(item.parentId);
  if (loaded == null) {
    return {
      parentTitle: null,
      parent: {
        id: item.parentId,
        title: null,
        url: item.url.replace(/\/\d+$/, `/${item.parentId}`),
        type: null,
        state: null,
        assignedTo: null,
      },
    };
  }
  return {
    parentTitle: loaded.title,
    parent: {
      id: loaded.id,
      title: loaded.title,
      url: loaded.url,
      type: loaded.type,
      state: loaded.state,
      assignedTo: loaded.assignedTo,
    },
  };
}

function canonicalName(name: string, members: readonly TeamMember[]): string {
  const known = members.find((member) => namesMatch(member.displayName, name));
  return known?.displayName ?? name.trim();
}

export function sprintSummary(workItems: readonly WorkItemSummary[]): SprintSummary {
  let tasks = 0;
  let bugs = 0;
  let pbis = 0;
  for (const item of workItems) {
    if (item.type === "Task") {
      tasks += 1;
    } else if (item.type === "Bug") {
      bugs += 1;
    } else if (item.type === PBI_TYPE) {
      pbis += 1;
    }
  }
  return {
    total: workItems.length,
    tasks,
    bugs,
    pbis,
    other: workItems.length - tasks - bugs - pbis,
  };
}

/**
 * Groups a sprint's work items under parent PBIs, places them on taskboard
 * columns, and filters by assignee and search text.
 */
export function groupBoard(input: GroupBoardInput): BoardModel {
  const itemsById = new Map(input.workItems.map((item) => [item.id, item]));
  for (const parent of input.parents ?? []) {
    if (!itemsById.has(parent.id)) {
      itemsById.set(parent.id, parent);
    }
  }
  const pbiIds = new Set(
    input.workItems.filter((item) => item.type === PBI_TYPE).map((item) => item.id),
  );
  const childrenByPbi = new Map<number, WorkItemSummary[]>();
  for (const item of input.workItems) {
    if (item.parentId == null || !pbiIds.has(item.parentId) || !CHILD_TYPES.has(item.type)) {
      continue;
    }
    const children = childrenByPbi.get(item.parentId) ?? [];
    children.push(item);
    childrenByPbi.set(item.parentId, children);
  }

  const tokens = searchTokens(input.query);
  const assigneeNames = (input.assignees ?? [])
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  const typeNames = (input.types ?? [])
    .map((type) => type.trim().toLowerCase())
    .filter((type) => type.length > 0);

  function matchesAssignees(assignedTo: string | null): boolean {
    if (assigneeNames.length === 0) {
      return true;
    }
    return assigneeNames.some((name) => namesMatch(assignedTo, name));
  }

  function matchesTypes(type: string): boolean {
    if (typeNames.length === 0) {
      return true;
    }
    return typeNames.includes(type.trim().toLowerCase());
  }

  function pbisForPerson(person: string): PersonPbi[] {
    const found: PersonPbi[] = [];
    for (const item of input.workItems) {
      if (item.type !== PBI_TYPE) {
        continue;
      }
      const parentTitle = parentOf(item, itemsById).parentTitle;
      const onItem =
        namesMatch(item.assignedTo, person) && matchesQuery(item, parentTitle, tokens);
      const onChild = (childrenByPbi.get(item.id) ?? []).some(
        (child) => namesMatch(child.assignedTo, person) && matchesQuery(child, item.title, tokens),
      );
      if (onItem || onChild) {
        found.push({ id: item.id, title: item.title, url: item.url });
      }
    }
    return found.sort((left, right) => left.id - right.id);
  }

  const placementByItem = new Map(
    input.placements.map((placement) => [placement.workItemId, placement.columnId]),
  );
  const taskboardColumns = [...input.columns].sort(
    (left, right) => left.order - right.order || left.name.localeCompare(right.name),
  );
  const usingStates = taskboardColumns.length === 0;
  const sortedColumns = usingStates ? stateColumns(input.workItems) : taskboardColumns;
  const knownColumns = new Map(sortedColumns.map((column) => [column.id, column]));

  const cards: BoardCard[] = [];
  for (const item of input.workItems) {
    const relation = parentOf(item, itemsById);
    if (!matchesQuery(item, relation.parentTitle, tokens)) {
      continue;
    }
    if (!matchesAssignees(item.assignedTo) || !matchesTypes(item.type)) {
      continue;
    }
    const column = knownColumns.get(placementByItem.get(item.id) ?? "");
    const stateColumn = usingStates ? knownColumns.get(`state:${item.state.trim()}`) : undefined;
    const matched =
      column ??
      stateColumn ??
      sortedColumns.find((candidate) =>
        (candidate.mappings ?? []).some(
          (mapping) => mapping.workItemType === item.type && mapping.state === item.state,
        ),
      );
    cards.push({
      item,
      parentTitle: relation.parentTitle,
      parent: relation.parent,
      children: [],
      columnId: matched?.id ?? UNMAPPED_COLUMN_ID,
      columnName: matched?.name ?? UNMAPPED_COLUMN_NAME,
    });
  }
  cards.sort((left, right) => left.item.id - right.item.id);

  const cardsById = new Map(cards.map((card) => [card.item.id, card]));
  for (const card of cards) {
    const parentId = card.item.parentId;
    const parentCard = parentId == null ? undefined : cardsById.get(parentId);
    if (parentCard == null) {
      continue;
    }
    parentCard.children.push({
      id: card.item.id,
      title: card.item.title,
      url: card.item.url,
      type: card.item.type,
      state: card.item.state,
      columnName: card.columnName,
    });
  }

  const columns: BoardColumnView[] = sortedColumns.map((column) => ({
    id: column.id,
    name: column.name,
    order: column.order,
    cards: cards.filter((card) => card.columnId === column.id),
  }));
  const unmapped = cards.filter((card) => card.columnId === UNMAPPED_COLUMN_ID);
  if (unmapped.length > 0) {
    columns.push({
      id: UNMAPPED_COLUMN_ID,
      name: UNMAPPED_COLUMN_NAME,
      order: Number.MAX_SAFE_INTEGER,
      cards: unmapped,
    });
  }

  const peopleByKey = new Map<string, PersonWork>();
  for (const card of cards) {
    const rawName = card.item.assignedTo?.trim() ?? "";
    if (rawName.length === 0) {
      continue;
    }
    const key = rawName.toLowerCase();
    const existing = peopleByKey.get(key);
    if (existing) {
      existing.cards.push(card);
      continue;
    }
    const known = input.members.find((member) => namesMatch(member.displayName, rawName));
    const displayName = known?.displayName ?? rawName;
    peopleByKey.set(key, {
      displayName,
      pbis: pbisForPerson(displayName),
      cards: [card],
    });
  }

  return {
    columns,
    people: [...peopleByKey.values()].sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    ),
    memberAnswers: assigneeNames.map((name) => ({
      displayName: canonicalName(name, input.members),
      pbis: pbisForPerson(name),
    })),
  };
}
