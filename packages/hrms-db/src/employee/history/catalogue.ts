import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import type { CatalogueField } from "./types";

type CatalogueRow = {
  SectionID: number;
  FieldID: number;
  FieldName: string | null;
  DisplayText: string | null;
  DisplayOrder: number | null;
  DB_Column: string | null;
  FieldEntity: string | null;
  FieldTypeID: number | null;
  FieldType_JSON_SQL: string | null;
  EmployerId: number;
  CountryID: number;
  IsHidden: boolean | number | null;
};

/**
 * Load active System/Country/Custom fields for the given section ids,
 * preferring tenant+country then falling back to EmployerId/CountryID = 0.
 */
export async function loadHistoryCatalogue(
  db: HrmsDb,
  input: {
    employerId: number;
    countryId: number;
    sectionIds: number[];
  },
): Promise<Map<number, CatalogueField[]>> {
  const result = new Map<number, CatalogueField[]>();
  if (input.sectionIds.length === 0) {
    return result;
  }

  const rows = await db.$queryRaw<CatalogueRow[]>`
    SELECT
        Field.SectionID,
        Field.FieldID,
        Field.FieldName,
        Field.DisplayText,
        Field.DisplayOrder,
        Field.DB_Column,
        Field.FieldEntity,
        Field.FieldTypeID,
        Field.FieldType_JSON_SQL,
        Field.EmployerId,
        Field.CountryID,
        Field.IsHidden
    FROM dbo.TEmployeeDetail_Fields AS Field
    WHERE Field.SectionID IN (${Prisma.join(input.sectionIds)})
      AND Field.EmployerId IN (${input.employerId}, 0)
      AND Field.CountryID IN (${input.countryId}, 0)
      AND ISNULL(Field.IsDeleted, 0) = 0
      AND ISNULL(Field.IsActive, 0) = 1
      AND Field.FieldEntity IN (N'System', N'Country', N'Custom')
    ORDER BY Field.SectionID, Field.DisplayOrder, Field.FieldID
  `;

  const ranked = new Map<string, { score: number; field: CatalogueField; sectionId: number }>();

  for (const row of rows) {
    if (row.IsHidden === true || row.IsHidden === 1) {
      continue;
    }
    const dbColumn =
      row.DB_Column?.trim() ||
      (row.FieldEntity === "Custom" ? null : row.FieldName?.trim() || null);
    const partitionKey = `${row.SectionID}|${
      row.FieldEntity === "Custom"
        ? `C:${row.FieldID}`
        : `S:${dbColumn ?? row.FieldName ?? row.FieldID}`
    }`;
    const score =
      (row.EmployerId === input.employerId ? 0 : 2) +
      (row.CountryID === input.countryId ? 0 : 1);
    const field: CatalogueField = {
      fieldId: row.FieldID,
      fieldName: row.FieldName?.trim() || `Field ${row.FieldID}`,
      displayText: row.DisplayText?.trim() || row.FieldName?.trim() || `Field ${row.FieldID}`,
      displayOrder: Number(row.DisplayOrder ?? 0),
      dbColumn,
      fieldEntity: row.FieldEntity,
      fieldTypeId: row.FieldTypeID,
      fieldTypeJsonSql: row.FieldType_JSON_SQL,
    };
    const existing = ranked.get(partitionKey);
    if (!existing || score < existing.score) {
      ranked.set(partitionKey, { score, field, sectionId: row.SectionID });
    }
  }

  for (const entry of ranked.values()) {
    const list = result.get(entry.sectionId) ?? [];
    list.push(entry.field);
    result.set(entry.sectionId, list);
  }

  for (const [sectionId, list] of result) {
    list.sort((a, b) => a.displayOrder - b.displayOrder || a.fieldId - b.fieldId);
    result.set(sectionId, list);
  }

  return result;
}

export function catalogueLabels(fields: CatalogueField[]): {
  labels: Record<string, string>;
  order: string[];
} {
  const labels: Record<string, string> = {};
  const order: string[] = [];
  for (const field of fields) {
    if (!field.dbColumn) {
      continue;
    }
    if (labels[field.dbColumn]) {
      continue;
    }
    labels[field.dbColumn] = field.displayText;
    order.push(field.dbColumn);
  }
  return { labels, order };
}

/** Parse static option arrays from FieldType_JSON_SQL when present. */
export function staticOptionMap(fields: CatalogueField[]): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const field of fields) {
    if (!field.dbColumn || !field.fieldTypeJsonSql) {
      continue;
    }
    const trimmed = field.fieldTypeJsonSql.trim();
    if (!trimmed.startsWith("[")) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) {
        continue;
      }
      const map = new Map<string, string>();
      for (const item of parsed) {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const id = String(rec.id ?? rec.Id ?? rec.value ?? rec.Value ?? "");
          const label = String(rec.label ?? rec.Label ?? rec.text ?? rec.Text ?? id);
          if (id) {
            map.set(id, label);
          }
        }
      }
      if (map.size > 0) {
        out.set(field.dbColumn, map);
      }
    } catch {
      // ignore invalid JSON option payloads
    }
  }
  return out;
}

export function applyOptionMaps(
  values: Record<string, string>,
  optionMaps: Map<string, Map<string, string>>,
): Record<string, string> {
  const next: Record<string, string> = { ...values };
  for (const [column, map] of optionMaps) {
    const raw = next[column];
    if (raw == null || raw === "") {
      continue;
    }
    const resolved = map.get(raw);
    if (resolved) {
      next[column] = resolved;
    }
  }
  return next;
}
