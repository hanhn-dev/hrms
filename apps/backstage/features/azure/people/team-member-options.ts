import type { TeamMember } from "@hrms/azure-devops";

export type TeamMemberValueKey = "id" | "displayName";

/** True when the member id is a local stub (display name used as id). */
export function isStubTeamMemberId(member: TeamMember): boolean {
  return member.id.trim().toLowerCase() === member.displayName.trim().toLowerCase();
}

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
 * Unions people rosters by case-insensitive display name. Primary entries win
 * unless the stored entry is a local stub and the incoming member has a real
 * Azure id — then the stub is upgraded so PR authorIds stay valid.
 */
export function mergeTeamMembers(
  primary: readonly TeamMember[],
  ...extras: readonly (readonly TeamMember[])[]
): TeamMember[] {
  const byName = new Map<string, TeamMember>();

  function put(member: TeamMember): void {
    const name = member.displayName.trim();
    if (name.length === 0) {
      return;
    }
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (existing == null) {
      byName.set(key, { id: member.id, displayName: name });
      return;
    }
    if (isStubTeamMemberId(existing) && !isStubTeamMemberId(member)) {
      byName.set(key, { id: member.id, displayName: name });
    }
  }

  for (const member of primary) {
    put(member);
  }
  for (const group of extras) {
    for (const member of group) {
      put(member);
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

function memberValue(member: TeamMember, valueKey: TeamMemberValueKey): string {
  return valueKey === "id" ? member.id.trim() : member.displayName.trim();
}

/**
 * Builds Select options from the roster, identity search hits, and already-selected
 * values. With a query of at least 2 characters, the roster is filtered locally;
 * search hits and selected values are always kept. Dedupes by display name and
 * prefers real Azure ids over local stubs when `valueKey` is `"id"`.
 */
export function buildTeamMemberOptions(input: {
  roster: readonly TeamMember[];
  searchHits: readonly TeamMember[];
  selected: readonly string[];
  query: string;
  valueKey?: TeamMemberValueKey;
  excludeValues?: readonly string[];
}): { value: string; label: string }[] {
  const valueKey = input.valueKey ?? "displayName";
  const trimmedQuery = input.query.trim().toLowerCase();
  const exclude = new Set(
    (input.excludeValues ?? []).map((value) => value.trim()).filter((value) => value.length > 0),
  );
  const byName = new Map<string, { value: string; label: string; stub: boolean }>();

  function remember(member: TeamMember, allowStub: boolean): void {
    const name = member.displayName.trim();
    if (name.length === 0) {
      return;
    }
    const stub = isStubTeamMemberId(member);
    // Id-mode options must be real Azure creator GUIDs; local stubs only stay
    // if they are already selected so the chip does not disappear.
    if (valueKey === "id" && stub && !allowStub) {
      return;
    }
    const value = memberValue(member, valueKey);
    if (value.length === 0) {
      return;
    }
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (existing == null || (existing.stub && !stub)) {
      byName.set(key, { value, label: name, stub });
    }
  }

  const selectedSet = new Set(
    input.selected.map((value) => value.trim()).filter((value) => value.length > 0),
  );

  for (const member of input.roster) {
    const name = member.displayName.trim();
    if (name.length === 0) {
      continue;
    }
    if (trimmedQuery.length < 2 || name.toLowerCase().includes(trimmedQuery)) {
      remember(member, selectedSet.has(memberValue(member, valueKey)));
    }
  }

  for (const hit of input.searchHits) {
    remember(hit, selectedSet.has(memberValue(hit, valueKey)));
  }

  const knownValues = new Set([...byName.values()].map((entry) => entry.value));
  const selectedExtras: { value: string; label: string }[] = [];
  for (const selected of input.selected) {
    const value = selected.trim();
    if (value.length === 0 || knownValues.has(value)) {
      continue;
    }
    const fromRoster =
      input.roster.find((member) => memberValue(member, valueKey) === value) ??
      input.searchHits.find((member) => memberValue(member, valueKey) === value);
    selectedExtras.push({ value, label: fromRoster?.displayName.trim() || value });
    knownValues.add(value);
  }

  return [...byName.values(), ...selectedExtras]
    .filter((entry) => !exclude.has(entry.value))
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: "base" }))
    .map((entry) => ({ value: entry.value, label: entry.label }));
}
