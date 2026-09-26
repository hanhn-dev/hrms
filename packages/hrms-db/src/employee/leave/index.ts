import type { HrmsDb } from "../../shared/client";
import { asIso } from "../../shared/iso";
import { requireResolvedEmployee } from "../../shared/employee";

export type LeaveBalanceRow = {
  transId: number;
  leaveType: string;
  leaveName: string | null;
  balanceDays: number | null;
  lastUpdateDate: string | null;
};

export async function getEmployeeLeaveBalances(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
): Promise<LeaveBalanceRow[]> {
  const identity = await requireResolvedEmployee(db, employerId, employmentNumber);
  const rows = await db.$queryRaw<
    Array<{
      TransId: number;
      LeaveType: string;
      LeaveName: string | null;
      BalanceDays: number | null;
      LastUpdateDate: Date | string | null;
    }>
  >`
    SELECT
        Balance.transid AS TransId,
        Balance.leavetype AS LeaveType,
        LeaveType.LeaveName,
        Balance.balancedays AS BalanceDays,
        Balance.lastupdatedate AS LastUpdateDate
    FROM dbo.tLeaveBalance AS Balance
    LEFT JOIN dbo.TLeaveTypeMaster AS LeaveType
        ON LeaveType.LeaveCode = Balance.leavetype
        AND LeaveType.Employerid = Balance.Employerid
    WHERE Balance.empid = ${identity.employeeId}
        AND Balance.Employerid = ${employerId}
    ORDER BY LeaveType.LeaveName, Balance.leavetype
  `;
  return rows.map((row) => ({
    transId: row.TransId,
    leaveType: row.LeaveType,
    leaveName: row.LeaveName,
    balanceDays: row.BalanceDays == null ? null : Number(row.BalanceDays),
    lastUpdateDate: asIso(row.LastUpdateDate),
  }));
}
