/**
 * Split a comma-separated work-item IDs string into tag values for the form.
 */
export function splitWorkItemIdTags(rawIds: string): string[] {
  return rawIds
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Join tag values back into the comma-separated string expected by search criteria.
 */
export function joinWorkItemIdTags(tags: readonly string[]): string {
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .join(", ");
}
