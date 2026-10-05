import type { HrmsDb } from "../../shared/client";
import { asIso } from "../../shared/iso";
import { employeeIdSchema, parseEmployerId, userIdSchema } from "../../shared/ids";
import { requireResolvedEmployee } from "../../shared/employee";
import { DEFAULT_RESET_PASSWORD, encodeHrmsPassword } from "./password";

export { DEFAULT_RESET_PASSWORD, encodeHrmsPassword } from "./password";

export type EmployeeLoginInfo = {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  userType: string | null;
  winLoginName: string | null;
  userIsActive: string | boolean | null;
  roleName: string | null;
  isUserIdLocked: string | boolean | null;
  invalidLoginAttemptCount: number | null;
  isForceToChangePassword: string | boolean | null;
  passwordChangedDate: string | null;
  failedAttemptsPolicy: number | null;
  passwordExpires: number | null;
};

export type FailedLoginAttempt = {
  deviceLoginAttemptId: number;
  deviceId: string | null;
  loginAttemptedAt: string | null;
  reason: string | null;
};

export async function getEmployeeLoginInfo(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
): Promise<{
  login: EmployeeLoginInfo | null;
  attempts: FailedLoginAttempt[];
}> {
  const identity = await requireResolvedEmployee(db, employerId, employmentNumber);
  const loginRows = await db.$queryRaw<
    Array<{
      UserID: number | null;
      UserName: string | null;
      UserEmail: string | null;
      UserType: string | null;
      WinLoginName: string | null;
      UserIsActive: string | boolean | null;
      RoleName: string | null;
      IsUserIDLocked: string | boolean | null;
      InvalidLoginAttemptCount: number | null;
      IsForceToChangePassword: string | boolean | null;
      PasswordChangedDate: Date | string | null;
      FailedAttempts: number | null;
      PasswordExpires: number | null;
    }>
  >`
    SELECT TOP (1)
        Users.UserID,
        Users.UserName,
        Users.UserEmail,
        Users.UserType,
        Users.WinLoginName,
        Users.IsActive AS UserIsActive,
        Roles.RoleName,
        Users.IsUserIDLocked,
        Users.InvalidLoginAttemptCount,
        Users.IsForceToChangePassword,
        Users.PasswordChangedDate,
        Employer.FailedAttempts,
        Employer.PasswordExpires
    FROM dbo.TEmployee AS Employee
    LEFT JOIN dbo.TUserEmployee AS UserEmployee
        ON UserEmployee.EmployeeID = Employee.EmployeeId
    LEFT JOIN dbo.TUsers AS Users
        ON Users.UserID = UserEmployee.UserID
        AND Users.Employerid = ${employerId}
    LEFT JOIN dbo.TRoles AS Roles
        ON Roles.RoleID = Users.RoleID
    LEFT JOIN dbo.TEmployerDetails AS Employer
        ON Employer.Employerid = Employee.Employerid
    WHERE Employee.EmployeeId = ${identity.employeeId}
        AND Employee.Employerid = ${employerId}
    ORDER BY Users.UserID DESC
  `;
  const attempts = await db.$queryRaw<
    Array<{
      DeviceLoginAttemptId: number;
      DeviceId: string | null;
      LoginAttemptedAt: Date | string | null;
      Reason: string | null;
    }>
  >`
    SELECT TOP 20
        Attempt.DeviceLoginAttemptId,
        Attempt.DeviceId,
        Attempt.LoginAttemptedAt,
        Attempt.Reason
    FROM dbo.TDeviceInvalidLoginAttemptDetails AS Attempt
    WHERE Attempt.EmployeeId = ${identity.employeeId}
    ORDER BY Attempt.LoginAttemptedAt DESC
  `;
  const row = loginRows[0];
  return {
    login: row
      ? {
          userId: row.UserID,
          userName: row.UserName,
          userEmail: row.UserEmail,
          userType: row.UserType,
          winLoginName: row.WinLoginName,
          userIsActive: row.UserIsActive,
          roleName: row.RoleName,
          isUserIdLocked: row.IsUserIDLocked,
          invalidLoginAttemptCount: row.InvalidLoginAttemptCount,
          isForceToChangePassword: row.IsForceToChangePassword,
          passwordChangedDate: asIso(row.PasswordChangedDate),
          failedAttemptsPolicy: row.FailedAttempts,
          passwordExpires: row.PasswordExpires,
        }
      : null,
    attempts: attempts.map((attempt) => ({
      deviceLoginAttemptId: attempt.DeviceLoginAttemptId,
      deviceId: attempt.DeviceId,
      loginAttemptedAt: asIso(attempt.LoginAttemptedAt),
      reason: attempt.Reason,
    })),
  };
}

export async function listUnlockPreview(
  db: HrmsDb,
  input: { employeeId: number; employerId: number },
): Promise<Array<Record<string, unknown>>> {
  return db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
        Users.UserID,
        Users.UserName,
        Users.Employerid,
        Users.IsActive,
        Users.IsUserIDLocked,
        Users.InvalidLoginAttemptCount,
        Users.IsForceToChangePassword
    FROM dbo.TUsers AS Users
    INNER JOIN dbo.TUserEmployee AS UserEmployee
        ON UserEmployee.UserID = Users.UserID
    WHERE UserEmployee.EmployeeID = ${input.employeeId}
        AND Users.Employerid = ${input.employerId}
  `;
}

export async function unlockUserAccount(
  db: HrmsDb,
  input: { employeeId: number; employerId: number },
): Promise<void> {
  const employerId = parseEmployerId(input.employerId);
  await db.$executeRaw`
    UPDATE Users
    SET
        Users.IsUserIDLocked = 'N',
        Users.InvalidLoginAttemptCount = 0
    FROM dbo.TUsers AS Users
    INNER JOIN dbo.TUserEmployee AS UserEmployee
        ON UserEmployee.UserID = Users.UserID
    WHERE UserEmployee.EmployeeID = ${input.employeeId}
        AND Users.Employerid = ${employerId}
  `;
}

export async function resetUserPassword(
  db: HrmsDb,
  input: {
    employeeId: number;
    employerId: number;
    modifiedBy: number;
  },
): Promise<void> {
  const employeeId = employeeIdSchema.parse(input.employeeId);
  const employerId = parseEmployerId(input.employerId);
  const modifiedBy = userIdSchema.parse(input.modifiedBy);
  const passwordStr = encodeHrmsPassword(DEFAULT_RESET_PASSWORD);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO dbo.TUsersHistory (
          UserID, UserName, PasswordStr, RoleID, UserEmail, IsActive,
          ChangedOn, ChangedBy, Employerid, IsGlobalAccess, EmployerIds,
          HistoryCreatedBy, HistoryCreatedDate, ActionType
      )
      SELECT
          Users.UserID, Users.UserName, Users.PasswordStr, Users.RoleID,
          Users.UserEmail, Users.IsActive,
          ISNULL(Users.ModifiedDate, Users.CreatedDate),
          ISNULL(Users.ModifiedBy, Users.CreatedBy),
          Users.Employerid, Users.IsGlobalAccess, Users.EmployerIds,
          ISNULL(Users.ModifiedBy, Users.CreatedBy),
          ISNULL(Users.ModifiedDate, Users.CreatedDate),
          'U'
      FROM dbo.TUsers AS Users
      INNER JOIN dbo.TUserEmployee AS UserEmployee
          ON UserEmployee.UserID = Users.UserID
      WHERE UserEmployee.EmployeeID = ${employeeId}
          AND Users.Employerid = ${employerId}
    `;
    const updated = await tx.$executeRaw`
      UPDATE Users
      SET
          Users.PasswordStr = ${passwordStr},
          Users.ModifiedBy = ${modifiedBy},
          Users.ModifiedDate = GETDATE(),
          Users.PasswordChangedDate = GETDATE(),
          Users.IsForceToChangePassword = 'N',
          Users.IsUserIdLocked = 'N',
          Users.InvalidLoginAttemptCount = 0
      FROM dbo.TUsers AS Users
      INNER JOIN dbo.TUserEmployee AS UserEmployee
          ON UserEmployee.UserID = Users.UserID
      WHERE UserEmployee.EmployeeID = ${employeeId}
          AND Users.Employerid = ${employerId}
    `;
    if (updated === 0) {
      throw new Error("No TUsers row was found for this employee.");
    }
    await tx.$executeRaw`
      INSERT INTO dbo.TuserPasswordHistory (
          EmployerId, UserName, PasswordStr, PasswordChangedDate
      )
      SELECT
          Users.Employerid,
          Users.UserName,
          Users.PasswordStr,
          GETDATE()
      FROM dbo.TUsers AS Users
      INNER JOIN dbo.TUserEmployee AS UserEmployee
          ON UserEmployee.UserID = Users.UserID
      WHERE UserEmployee.EmployeeID = ${employeeId}
          AND Users.Employerid = ${employerId}
    `;
  });
}
