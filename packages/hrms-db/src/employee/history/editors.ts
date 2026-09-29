import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import type { HistoryEditor } from "./types";

export async function loadHistoryEditors(
  db: HrmsDb,
  employeeIds: Iterable<number>,
): Promise<Map<number, HistoryEditor>> {
  const ids = Array.from(
    new Set(
      Array.from(employeeIds).filter(
        (id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0,
      ),
    ),
  );
  const map = new Map<number, HistoryEditor>();
  if (ids.length === 0) {
    return map;
  }

  const rows = await db.$queryRaw<
    Array<{
      EmployeeId: number;
      Name: string | null;
      EmploymentNumber: string | null;
    }>
  >`
    SELECT
        Emp.EmployeeId,
        LTRIM(RTRIM(CONCAT_WS(
          ' ',
          NULLIF(LTRIM(RTRIM(Emp.FName)), ''),
          NULLIF(LTRIM(RTRIM(Emp.MiddleName)), ''),
          NULLIF(LTRIM(RTRIM(Emp.LName)), '')
        ))) AS Name,
        Info.EmploymentNumber
    FROM dbo.TEmployee AS Emp
    LEFT JOIN dbo.TEmployeeInfo AS Info
        ON Info.EmployeeId = Emp.EmployeeId
    WHERE Emp.EmployeeId IN (${Prisma.join(ids)})
  `;

  for (const row of rows) {
    map.set(row.EmployeeId, {
      employeeId: row.EmployeeId,
      name: row.Name?.trim() || `Employee ${row.EmployeeId}`,
      employmentNumber: row.EmploymentNumber?.trim() || "",
    });
  }
  return map;
}
