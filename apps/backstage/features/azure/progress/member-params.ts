/** Parse a single `teamId` query value. */
export function parseTeamId(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length === 0 ? null : trimmed;
}

/** @deprecated Prefer parseTeamId — kept for one-release legacy `list=` bookmarks. */
export function parseListId(value: string | undefined): string | null {
  return parseTeamId(value);
}

/** Parse repeatable `member` query values into a deduped display-name list. */
export function parseMemberParams(value: string | string[] | undefined): string[] {
  const values = value == null ? [] : Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of values) {
    const trimmed = entry.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/** Serialize members for a URL search string (empty → omit). */
export function serializeMemberParams(members: readonly string[]): string[] | null {
  const parsed = parseMemberParams([...members]);
  return parsed.length === 0 ? null : parsed;
}
