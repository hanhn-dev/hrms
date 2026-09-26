export const FIELD_SOURCES = ["employer", "template", "compare"] as const;

export type FieldSource = (typeof FIELD_SOURCES)[number];

export function parseFieldSource(value: string | undefined): FieldSource {
  if (value === "template" || value === "compare") {
    return value;
  }
  return "employer";
}
