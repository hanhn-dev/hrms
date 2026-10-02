import type { SectionFormField } from "./form-fields";
import type { SectionRecordRow } from "./records";

const RELATIONSHIP_COLUMNS = new Set(["relation", "relationship"]);

export function relationshipDisplayTexts(fields: readonly SectionFormField[]): string[] {
  const texts = new Set<string>();
  for (const field of fields) {
    const column = (field.dbColumn ?? "").trim().toLowerCase();
    if (RELATIONSHIP_COLUMNS.has(column)) {
      texts.add(field.displayText);
    }
  }
  return [...texts];
}

export function relationshipId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : null;
  }
  return null;
}

export function collectRelationshipIds(
  records: readonly SectionRecordRow[],
  displayTexts: readonly string[],
): number[] {
  const ids = new Set<number>();
  for (const record of records) {
    for (const text of displayTexts) {
      const id = relationshipId(record.values[text]);
      if (id != null) ids.add(id);
    }
  }
  return [...ids];
}

export function applyRelationshipLabels(
  records: readonly SectionRecordRow[],
  displayTexts: readonly string[],
  labels: ReadonlyMap<number, string>,
): SectionRecordRow[] {
  return records.map((record) => {
    let values = record.values;
    let changed = false;
    for (const text of displayTexts) {
      const id = relationshipId(values[text]);
      const label = id == null ? undefined : labels.get(id);
      if (label == null || label === "") continue;
      if (!changed) {
        values = { ...values };
        changed = true;
      }
      values[text] = label;
    }
    return changed ? { ...record, values } : record;
  });
}
