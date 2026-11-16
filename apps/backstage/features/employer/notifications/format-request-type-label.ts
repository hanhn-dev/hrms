/** Turn a PascalCase / camelCase request type into a spaced label. */
export function formatRequestTypeLabel(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
