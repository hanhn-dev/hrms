import type { HrmsDb } from "../../shared/client";
import { groupFieldChangesIntoEvents, normalizeDisplayValue, snapshotsToEvents } from "./diff";
import { asNumber, asTimeStampIso, isTruthyDeleted } from "./sql";
import type { HistoryChangeEvent, HistoryChangeField, HistoryEditor, HistorySnapshot } from "./types";

function formatExpValue(level: unknown, months: unknown, lastUsed: unknown): string {
  const levelText = level == null || level === "" ? "" : String(level);
  const m = asNumber(months) ?? 0;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  const last =
    lastUsed instanceof Date
      ? lastUsed.toISOString().slice(0, 10)
      : typeof lastUsed === "string"
        ? lastUsed.slice(0, 10)
        : "";
  return `Self Rating(0 to 10):${levelText}, Exp:${years} Years and ${rem} Months, Last Used:${last}`;
}

export async function loadSkillHistory(
  db: HrmsDb,
  input: {
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  type Row = {
    SkillDetailsHistoryId: number;
    SkillDetailsId: number;
    SkillId: number | null;
    SkillName: string | null;
    Level: number | string | null;
    ExperianceInMonths: number | null;
    LastUsedDate: Date | string | null;
    LastUpdatedBy: number | null;
    LastModifyOnUtcTime: Date | string | null;
    Isdeleted: string | null;
  };

  let rows: Row[] = [];
  try {
    rows =
      input.from && input.toExclusive
        ? await db.$queryRaw<Row[]>`
            SELECT
                H.SkillDetailsHistoryId,
                H.SkillDetailsId,
                H.SkillId,
                S.SkillName,
                H.Level,
                H.ExperianceInMonths,
                H.LastUsedDate,
                H.LastUpdatedBy,
                H.LastModifyOnUtcTime,
                H.Isdeleted
            FROM dbo.TEmployeeskillhistoryDetails AS H
            LEFT JOIN dbo.TmSkills AS S
                ON S.SkillId = H.SkillId
            WHERE H.EmployeeId = ${input.employeeId}
              AND H.LastModifyOnUtcTime >= ${input.from}
              AND H.LastModifyOnUtcTime < ${input.toExclusive}
            ORDER BY H.SkillDetailsId, H.LastModifyOnUtcTime ASC, H.SkillDetailsHistoryId ASC
          `
        : await db.$queryRaw<Row[]>`
            SELECT
                H.SkillDetailsHistoryId,
                H.SkillDetailsId,
                H.SkillId,
                S.SkillName,
                H.Level,
                H.ExperianceInMonths,
                H.LastUsedDate,
                H.LastUpdatedBy,
                H.LastModifyOnUtcTime,
                H.Isdeleted
            FROM dbo.TEmployeeskillhistoryDetails AS H
            LEFT JOIN dbo.TmSkills AS S
                ON S.SkillId = H.SkillId
            WHERE H.EmployeeId = ${input.employeeId}
            ORDER BY H.SkillDetailsId, H.LastModifyOnUtcTime ASC, H.SkillDetailsHistoryId ASC
          `;
  } catch {
    return [];
  }

  return entitySeriesToEvents(
    "Skill Details",
    rows
      .map((row) => {
        const timeStamp = asTimeStampIso(row.LastModifyOnUtcTime);
        if (!timeStamp) {
          return null;
        }
        return {
          entityId: row.SkillDetailsId,
          field: row.SkillName?.trim() || `Skill ${row.SkillId ?? row.SkillDetailsId}`,
          timeStamp,
          editorEmployeeId: row.LastUpdatedBy,
          deleted: isTruthyDeleted(row.Isdeleted) || row.Isdeleted === "Y",
          value: formatExpValue(row.Level, row.ExperianceInMonths, row.LastUsedDate),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
    input.editors,
  );
}

export async function loadDomainHistory(
  db: HrmsDb,
  input: {
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  type Row = {
    DomainDetailsId: number;
    DomainId: number | null;
    DomainName: string | null;
    Level: number | string | null;
    ExperianceInMonths: number | null;
    LastUsedDate: Date | string | null;
    LastModifiedBy: number | null;
    LastModifyOnUtcTime: Date | string | null;
    Isdeleted: string | null;
  };

  let rows: Row[] = [];
  try {
    rows =
      input.from && input.toExclusive
        ? await db.$queryRaw<Row[]>`
            SELECT
                H.DomainDetailsId,
                H.DomainId,
                M.DomainName,
                H.Level,
                H.ExperianceInMonths,
                H.LastUsedDate,
                H.LastModifiedBy,
                H.LastModifyOnUtcTime,
                H.Isdeleted
            FROM dbo.TEmpDomainHistoryDetails AS H
            LEFT JOIN dbo.TSkillDomainMaster AS M
                ON M.Domainid = H.DomainId
            WHERE H.EmployeeId = ${input.employeeId}
              AND H.LastModifyOnUtcTime >= ${input.from}
              AND H.LastModifyOnUtcTime < ${input.toExclusive}
            ORDER BY H.DomainDetailsId, H.LastModifyOnUtcTime ASC
          `
        : await db.$queryRaw<Row[]>`
            SELECT
                H.DomainDetailsId,
                H.DomainId,
                M.DomainName,
                H.Level,
                H.ExperianceInMonths,
                H.LastUsedDate,
                H.LastModifiedBy,
                H.LastModifyOnUtcTime,
                H.Isdeleted
            FROM dbo.TEmpDomainHistoryDetails AS H
            LEFT JOIN dbo.TSkillDomainMaster AS M
                ON M.Domainid = H.DomainId
            WHERE H.EmployeeId = ${input.employeeId}
            ORDER BY H.DomainDetailsId, H.LastModifyOnUtcTime ASC
          `;
  } catch {
    return [];
  }

  return entitySeriesToEvents(
    "Domain Details",
    rows
      .map((row) => {
        const timeStamp = asTimeStampIso(row.LastModifyOnUtcTime);
        if (!timeStamp) {
          return null;
        }
        return {
          entityId: row.DomainDetailsId,
          field: row.DomainName?.trim() || `Domain ${row.DomainId ?? row.DomainDetailsId}`,
          timeStamp,
          editorEmployeeId: row.LastModifiedBy,
          deleted: isTruthyDeleted(row.Isdeleted) || row.Isdeleted === "Y",
          value: formatExpValue(row.Level, row.ExperianceInMonths, row.LastUsedDate),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
    input.editors,
  );
}

function entitySeriesToEvents(
  section: string,
  rows: Array<{
    entityId: number;
    field: string;
    timeStamp: string;
    editorEmployeeId: number | null;
    deleted: boolean;
    value: string;
  }>,
  editors: Map<number, HistoryEditor>,
): HistoryChangeEvent[] {
  const byEntity = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = byEntity.get(row.entityId) ?? [];
    list.push(row);
    byEntity.set(row.entityId, list);
  }

  const fieldRows: Array<{
    timeStamp: string;
    editorEmployeeId: number | null;
    change: HistoryChangeField;
  }> = [];

  for (const series of byEntity.values()) {
    series.sort((a, b) =>
      a.timeStamp === b.timeStamp ? 0 : a.timeStamp < b.timeStamp ? -1 : 1,
    );
    for (let i = 0; i < series.length; i++) {
      const curr = series[i]!;
      const prev = i === 0 ? null : series[i - 1]!;
      if (!curr.deleted && prev && curr.value === prev.value) {
        continue;
      }
      const changeType = curr.deleted
        ? "REMOVED"
        : !prev
          ? "ADDED"
          : "MODIFIED";
      fieldRows.push({
        timeStamp: curr.timeStamp,
        editorEmployeeId: curr.editorEmployeeId,
        change: {
          field: curr.field,
          oldValue: prev?.value || "NOT SET",
          newValue: curr.deleted ? "NOT SET" : curr.value || "NOT SET",
          changeType,
        },
      });
    }
  }

  return groupFieldChangesIntoEvents(section, fieldRows, editors);
}

export async function loadVisaHistory(
  db: HrmsDb,
  input: {
    employeeId: number;
    from: Date | null;
    toExclusive: Date | null;
    editors: Map<number, HistoryEditor>;
  },
): Promise<HistoryChangeEvent[]> {
  type Row = Record<string, unknown>;
  let historyRows: Row[] = [];
  let liveRows: Row[] = [];
  try {
    [historyRows, liveRows] = await Promise.all([
      input.from && input.toExclusive
        ? db.$queryRaw<Row[]>`
            SELECT *
            FROM dbo.TEmployeeVisaInfoHistory
            WHERE EmployeeId = ${input.employeeId}
              AND UpdatedDateUtcTime IS NOT NULL
              AND UpdatedDateUtcTime >= ${input.from}
              AND UpdatedDateUtcTime < ${input.toExclusive}
          `
        : db.$queryRaw<Row[]>`
            SELECT *
            FROM dbo.TEmployeeVisaInfoHistory
            WHERE EmployeeId = ${input.employeeId}
          `,
      db.$queryRaw<Row[]>`
        SELECT *
        FROM dbo.TEmployeeVisaInfo
        WHERE EmployeeId = ${input.employeeId}
      `,
    ]);
  } catch {
    return [];
  }

  const skip = new Set(
    [
      "CreatedBy",
      "CreatedDate",
      "UpdatedBy",
      "UpdatedDate",
      "UpdatedDateUtcTime",
      "ModifiedBy",
      "ModifiedDate",
      "ModifiedDateUtc",
      "HistoryId",
      "VisaId",
      "EmployeeId",
      "IsDelete",
      "IsDeleted",
    ].map((s) => s.toLowerCase()),
  );

  const toSnap = (row: Row, isLive: boolean): HistorySnapshot | null => {
    const visaId = asNumber(row.VisaId) ?? 0;
    const ts = asTimeStampIso(row.UpdatedDateUtcTime ?? row.ModifiedDateUtc);
    if (!ts) {
      return null;
    }
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      if (skip.has(key.toLowerCase())) {
        continue;
      }
      values[key] = normalizeDisplayValue(value);
    }
    return {
      entityKey: String(visaId || ts),
      timeStamp: ts,
      historyId: isLive ? 2_000_000_000 : (asNumber(row.HistoryId) ?? 0),
      editorEmployeeId:
        asNumber(row.UpdatedBy ?? row.ModifiedBy ?? row.LastUpdatedBy ?? row.CreatedBy) ?? null,
      isDeleted: isTruthyDeleted(row.IsDelete ?? row.IsDeleted),
      values,
    };
  };

  const snapshots = [
    ...historyRows.map((row) => toSnap(row, false)),
    ...liveRows.map((row) => toSnap(row, true)),
  ].filter((snap): snap is HistorySnapshot => snap != null);
  const labels: Record<string, string> = {};
  const order: string[] = [];
  for (const key of Object.keys(snapshots[0]?.values ?? {})) {
    labels[key] = key;
    order.push(key);
  }
  return snapshotsToEvents("Passport Details", snapshots, labels, order, input.editors);
}
