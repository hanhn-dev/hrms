import type { TeamMember } from "@hrms/azure-devops";

/** Turns display names (e.g. local progress-team members) into TeamMember stubs. */
export function teamMembersFromNames(names: readonly string[]): TeamMember[] {
  const byName = new Map<string, TeamMember>();
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { id: trimmed, displayName: trimmed });
    }
  }
  return [...byName.values()];
}

/**
 * Unions author rosters by case-insensitive display name. Primary entries win
 * so Azure ids are kept when the same person also appears on a local team.
 */
export function mergeTeamMembers(
  primary: readonly TeamMember[],
  ...extras: readonly (readonly TeamMember[])[]
): TeamMember[] {
  const byName = new Map<string, TeamMember>();
  for (const member of primary) {
    const name = member.displayName.trim();
    if (name.length === 0) {
      continue;
    }
    byName.set(name.toLowerCase(), { id: member.id, displayName: name });
  }
  for (const group of extras) {
    for (const member of group) {
      const name = member.displayName.trim();
      if (name.length === 0) {
        continue;
      }
      const key = name.toLowerCase();
      if (!byName.has(key)) {
        byName.set(key, { id: member.id, displayName: name });
      }
    }
  }
  return [...byName.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" }),
  );
}

export function filterTeamMembersByQuery(
  members: readonly TeamMember[],
  query: string,
): TeamMember[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 2) {
    return [];
  }
  return members.filter((member) => member.displayName.toLowerCase().includes(trimmed));
}

/**
 * Builds Authors Select options from the board-team / local-team roster, identity
 * search hits, and already-selected names. With a query of at least 2 characters,
 * the roster is filtered locally; search hits and selected values are always kept.
 */
export function buildAuthorOptions(input: {
  roster: readonly TeamMember[];
  searchHits: readonly TeamMember[];
  selected: readonly string[];
  query: string;
}): { value: string; label: string }[] {
  const trimmedQuery = input.query.trim().toLowerCase();
  const names = new Set<string>();

  for (const author of input.roster) {
    const name = author.displayName.trim();
    if (name.length === 0) {
      continue;
    }
    if (trimmedQuery.length < 2 || name.toLowerCase().includes(trimmedQuery)) {
      names.add(name);
    }
  }

  for (const hit of input.searchHits) {
    const name = hit.displayName.trim();
    if (name.length > 0) {
      names.add(name);
    }
  }

  for (const selected of input.selected) {
    const name = selected.trim();
    if (name.length > 0) {
      names.add(name);
    }
  }

  return [...names]
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }))
    .map((name) => ({ value: name, label: name }));
}
