import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { requireResolvedEmployee } from "../../shared/employee";
import { parseEmployerId } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import { asNumber } from "../history/sql";
import type { SectionFormField } from "./form-fields";
import {
  groupPendingSectionRecords,
  type PendingSectionRow,
} from "./pending-records";
import { sectionRecordSpecForId } from "./record-registry";
import type { SectionRecordRow } from "./records";
import {
  loadSectionLookupLabels,
  withSectionLookups,
} from "./section-lookups";

type DetailQueryRow = {
  ChangeRequestId: number | bigint;
  RequestedDateUtc: Date | string | null;
  RequestedDate: Date | string | null;
  TableName: string | null;
  SectionName: string | null;
  FieldName: string | null;
  DBFieldName: string | null;
  TextValueNew: string | null;
  NewValue: string | null;
  IsNew: boolean | number | null;
  ChildRowId: number | bigint | null;
};

function asBool(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
}

export async function listPendingSectionRecords(
  db: HrmsDb,
  input: {
    employerId: number;
    employmentNumber: string;
    sectionId: number;
    fields: SectionFormField[];
    liveRecords: SectionRecordRow[];
  },
): Promise<PendingSectionRow[]> {
  const spec = sectionRecordSpecForId(input.sectionId);
  if (!spec) return [];

  const tenantId = parseEmployerId(input.employerId);
  const identity = await requireResolvedEmployee(
    db,
    tenantId,
    input.employmentNumber,
  );
  const tables = spec.tables.map((table) => table.liveTable.toLowerCase());
  const rows = await db.$queryRaw<DetailQueryRow[]>`
    SELECT
        Header.ChangeRequestId,
        Header.RequestedDateUtc,
        Header.RequestedDate,
        Detail.TableName,
        Detail.SectionName,
        Detail.FieldName,
        Detail.DBFieldName,
        Detail.TextValueNew,
        Detail.NewValue,
        Detail.IsNew,
        Detail.ChildRowId
    FROM dbo.TMyDetailsChangeRequests AS Header
    INNER JOIN dbo.TMyDetailsChangeRequestDetails AS Detail
        ON Detail.ChangeRequestId = Header.ChangeRequestId
    WHERE Header.EmployeeId = ${identity.employeeId}
      AND Header.EmployerId = ${tenantId}
      AND Header.IsApproved IS NULL
      AND LOWER(Detail.TableName) IN (${Prisma.join(tables)})
    ORDER BY Header.ChangeRequestId DESC, Detail.ChangeDetailsId ASC
  `;

  const pending = groupPendingSectionRecords({
    tables: spec.tables.map((table) => table.liveTable),
    fields: input.fields,
    liveRecords: input.liveRecords,
    details: rows.flatMap((row) => {
      const changeRequestId = asNumber(row.ChangeRequestId);
      if (changeRequestId == null) return [];
      return [
        {
          changeRequestId,
          requestedAt: asIso(row.RequestedDateUtc) ?? asIso(row.RequestedDate),
          tableName: row.TableName,
          sectionName: row.SectionName,
          fieldName: row.FieldName,
          dbFieldName: row.DBFieldName,
          textValueNew: row.TextValueNew,
          newValue: row.NewValue,
          isNew: asBool(row.IsNew),
          childRowId: asNumber(row.ChildRowId),
        },
      ];
    }),
  });
  const labels = await loadSectionLookupLabels(db, input.fields, pending);
  return withSectionLookups(input.fields, pending, labels);
}
