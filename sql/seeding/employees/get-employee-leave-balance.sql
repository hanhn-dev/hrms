-- Quick check: current leave balance for one employee (no eligibility/business-rule filtering).
-- For the full, app-accurate view (waiting period, eligibility, pending-approval days, carry-forward),
-- use the stored procedure instead: EXEC dbo.SP_LA_GetEmployeeLeaveBalanceDetails @in_EmployeeID = @EmployeeID;

DECLARE @EmployeeID INT = 0; -- TODO: set EmployeeId

SELECT lb.leavetype, ltm.LeaveName, lb.balancedays, lb.lastupdatedate
FROM dbo.tLeaveBalance lb
JOIN dbo.TLeaveTypeMaster ltm
    ON ltm.LeaveCode = lb.leavetype AND ltm.Employerid = lb.Employerid
WHERE lb.empid = @EmployeeID;
