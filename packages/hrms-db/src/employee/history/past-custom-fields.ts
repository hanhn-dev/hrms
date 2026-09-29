import type { HrmsDb } from "../../shared/client";
import {
  displayOrNotSet,
  groupFieldChangesIntoEvents,
  normalizeDisplayValue,
} from "./diff";
import { asNumber, asTimeStampIso, isTruthyDeleted } from "./sql";
import type { HistoryChangeEvent, HistoryChangeField, HistoryEditor } from "./types";

/**
 * Resolve Personal Details lookup ids the same way
 * SP_Mydetails_Enhanced_GetEmpPersonalHistoryDetails does.
 */
export async function loadPersonalLookupMaps(
  db: HrmsDb,
): Promise<Map<string, Map<string, string>>> {
  const maps = new Map<string, Map<string, string>>();
  try {
    const [titles, marital, genders] = await Promise.all([
      db.$queryRaw<Array<{ ID: number; PersonalTitle: string | null }>>`
        SELECT ID, PersonalTitle FROM dbo.TPersonalTitle
      `.catch(() => [] as Array<{ ID: number; PersonalTitle: string | null }>),
      db.$queryRaw<Array<{ id: number; MaritalStatus: string | null }>>`
        SELECT id, MaritalStatus FROM dbo.TMaritalStatus
      `.catch(() => [] as Array<{ id: number; MaritalStatus: string | null }>),
      db.$queryRaw<Array<{ ID: number; Gender: string | null }>>`
        SELECT ID, Gender FROM dbo.TGender
      `.catch(() => [] as Array<{ ID: number; Gender: string | null }>),
    ]);

    const titleMap = new Map<string, string>();
    for (const row of titles) {
      if (row.PersonalTitle) {
        titleMap.set(String(row.ID), row.PersonalTitle);
      }
    }
    maps.set("TitleID", titleMap);
    maps.set("TitleId", titleMap);
    maps.set("Title", titleMap);

    const maritalMap = new Map<string, string>();
    for (const row of marital) {
      if (row.MaritalStatus) {
        maritalMap.set(String(row.id), row.MaritalStatus);
      }
    }
    maps.set("MaritalStatusID", maritalMap);
    maps.set("MaritalStatusId", maritalMap);
    maps.set("MaritalStatus", maritalMap);

    const genderMap = new Map<string, string>();
    for (const row of genders) {
      if (row.Gender) {
        genderMap.set(String(row.ID), row.Gender);
      }
    }
    // Fallback if TGender missing — common HRMS 1/2 encoding.
    if (genderMap.size === 0) {
      genderMap.set("1", "Male");
      genderMap.set("2", "Female");
    }
    maps.set("Gender", genderMap);
  } catch {
    // Lookups are best-effort; raw ids still usable.
  }
  return maps;
}

export function applyPersonalLookups(
  values: Record<string, string>,
  maps: Map<string, Map<string, string>>,
  row: Record<string, unknown>,
): Record<string, string> {
  const next = { ...values };

  // ShowBirthday / Send Birthday Notification — SP: 1→Yes else No
  for (const key of ["ShowBirthday", "showBirthday"]) {
    if (key in row || next[key] !== undefined) {
      const raw = row[key] ?? next[key];
      const yes =
        raw === true || raw === 1 || raw === "1" || String(raw).toLowerCase() === "yes";
      next[key] = yes ? "Yes" : "No";
      break;
    }
  }

  for (const [column, map] of maps) {
    const raw = next[column];
    if (raw == null || raw === "") {
      continue;
    }
    const label = map.get(raw);
    if (label) {
      next[column] = label;
    }
  }
  return next;
}

/**
 * Custom field history for a My Details section (Personal = 1), matching the
 * SP UNION over TEmployeedetailCustomFieldshistory.
 */
export async function loadSectionCustomFieldHistory(
  db: HrmsDb,
  input: {
    employeeId: number;
    sectionId: number;
    sectionName: string;
    from: Date | null;
    toExclusive: Date | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  type CustomRow = {
    HistoryCustomFieldId: number;
    CustFieldID: number;
    FieldName: string | null;
    DisplayText: string | null;
    CustomValue: string | null;
    ModifiedBy: number | null;
    ModifiedDateUtc: Date | string | null;
    Isdelete: boolean | number | null;
  };

  let rows: CustomRow[] = [];
  try {
    rows = await db.$queryRaw<CustomRow[]>`
      SELECT
          tc.HistoryCustomFieldId,
          tc.CustFieldID,
          tf.FieldName,
          tf.DisplayText,
          CASE
            WHEN tf.FieldTypeID IN (1, 2, 7) THEN ISNULL((
              SELECT STRING_AGG(v.CustomValue, ' & ')
              FROM dbo.TEmployeedetailCustomFieldvalues AS v
              WHERE CAST(v.CustomValueId AS VARCHAR(100)) IN (
                SELECT value FROM STRING_SPLIT(CAST(tc.CustomValue AS VARCHAR(MAX)), ',')
              )
            ), REPLACE(CAST(tc.CustomValue AS VARCHAR(MAX)), ',', ' & '))
            ELSE CAST(tc.CustomValue AS VARCHAR(MAX))
          END AS CustomValue,
          tc.ModifiedBy,
          tc.ModifiedDateUtc,
          tc.Isdelete
      FROM dbo.TEmployeedetailCustomFieldshistory AS tc
      INNER JOIN dbo.TEmployeeDetail_Fields AS tf
          ON tf.FieldID = tc.CustFieldID
      WHERE tc.EmployeeId = ${input.employeeId}
        AND tf.SectionID = ${input.sectionId}
        AND ISNULL(tf.IsDeleted, 0) = 0
      ORDER BY tc.CustFieldID, tc.ModifiedDateUtc ASC, tc.HistoryCustomFieldId ASC
    `;
  } catch {
    return [];
  }

  const byField = new Map<number, CustomRow[]>();
  for (const row of rows) {
    const list = byField.get(row.CustFieldID) ?? [];
    list.push(row);
    byField.set(row.CustFieldID, list);
  }

  const fromMs = input.from?.getTime() ?? null;
  const toMs = input.toExclusive?.getTime() ?? null;
  const fieldRows: Array<{
    timeStamp: string;
    editorEmployeeId: number | null;
    change: HistoryChangeField;
  }> = [];

  for (const series of byField.values()) {
    for (let i = 0; i < series.length; i++) {
      const curr = series[i]!;
      const prev = i === 0 ? null : series[i - 1]!;
      const timeStamp = asTimeStampIso(curr.ModifiedDateUtc);
      if (!timeStamp) {
        continue;
      }
      const ms = new Date(timeStamp).getTime();
      if (fromMs != null && ms < fromMs) {
        continue;
      }
      if (toMs != null && ms >= toMs) {
        continue;
      }

      const label =
        curr.DisplayText?.trim() || curr.FieldName?.trim() || `Field ${curr.CustFieldID}`;
      const removed = isTruthyDeleted(curr.Isdelete);
      const newValue = removed ? "" : normalizeDisplayValue(curr.CustomValue);
      const oldValue = prev ? normalizeDisplayValue(prev.CustomValue) : "";

      if (removed) {
        fieldRows.push({
          timeStamp,
          editorEmployeeId: asNumber(curr.ModifiedBy),
          change: {
            field: label,
            oldValue: displayOrNotSet(oldValue || newValue),
            newValue: "NOT SET",
            changeType: "REMOVED",
          },
        });
        continue;
      }

      // First custom-field snapshot = ADDED (include empty), else only when changed.
      if (!prev) {
        fieldRows.push({
          timeStamp,
          editorEmployeeId: asNumber(curr.ModifiedBy),
          change: {
            field: label,
            oldValue: "NOT SET",
            newValue: newValue === "" ? "" : displayOrNotSet(newValue),
            changeType: "ADDED",
          },
        });
        continue;
      }
      if (newValue === oldValue) {
        continue;
      }
      fieldRows.push({
        timeStamp,
        editorEmployeeId: asNumber(curr.ModifiedBy),
        change: {
          field: label,
          oldValue: displayOrNotSet(oldValue),
          newValue: displayOrNotSet(newValue),
          changeType:
            oldValue === "" && newValue !== ""
              ? "ADDED"
              : newValue === ""
                ? "REMOVED"
                : "MODIFIED",
        },
      });
    }
  }

  return groupFieldChangesIntoEvents(input.sectionName, fieldRows, input.editors);
}
