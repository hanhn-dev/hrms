export const FIELD_SOURCES = ["employer", "template", "compare"] as const;

export type FieldSource = (typeof FIELD_SOURCES)[number];

export function parseFieldSource(value: string | undefined): FieldSource {
  if (value === "template" || value === "compare") {
    return value;
  }
  return "employer";
}

export function parseFieldFocus(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function fieldsHref(
  employerId: number,
  params: { source?: FieldSource; section?: string | null; field?: string | null } = {},
): string {
  const search = new URLSearchParams();
  if (params.source && params.source !== "employer") {
    search.set("source", params.source);
  }
  if (params.section) {
    search.set("section", params.section);
  }
  if (params.field) {
    search.set("field", params.field);
  }
  const query = search.toString();
  return `/employers/${employerId}/fields${query ? `?${query}` : ""}`;
}
