/* =============================================================================
   Fix test logins created by an earlier version of
   seed-new-employer-performance-test.sql that stored TUsers.UserName /
   UserEmail as plaintext.

   Login.aspx (EMAILID mode) Base64-encodes the email before calling
   SP_LOG_CheckUser, which compares via FN_ConvertBase64ToSTR(UserEmail).
   Production (SP_EC_AddNewEmployee) stores:
     UserName  = FN_ConvertSTRToBase64(EmploymentNumber)
     UserEmail = FN_ConvertSTRToBase64(EmailID)

   Edit @CustId (or @EmployerId), then run. PasswordStr is left alone.
   ========================================================================== */

SET NOCOUNT ON;

DECLARE @CustId     VARCHAR(10) = 'C00232';  -- e.g. from the login Customer Number field
DECLARE @EmployerId INT =
    (SELECT Employerid FROM dbo.TEmployerDetails WHERE custid = @CustId);

IF @EmployerId IS NULL
    THROW 50000, 'Employer not found for that custid.', 1;

UPDATE u
SET
    u.UserName  = dbo.FN_ConvertSTRToBase64(ei.EmploymentNumber),
    u.UserEmail = dbo.FN_ConvertSTRToBase64(e.EmailID)
FROM dbo.TUsers u
JOIN dbo.TUserEmployee ue ON ue.UserID = u.UserID
JOIN dbo.TEmployee e      ON e.EmployeeId = ue.EmployeeID
JOIN dbo.TEmployeeInfo ei ON ei.EmployeeId = e.EmployeeId
WHERE u.Employerid = @EmployerId
  AND e.Employerid = @EmployerId
  -- only rewrite rows that still look like plaintext emails (contain '@')
  AND u.UserEmail LIKE '%@%';

PRINT 'Updated ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' TUsers row(s) for Employerid '
    + CAST(@EmployerId AS VARCHAR(10)) + ' (custid ' + @CustId + ').';

SELECT u.UserID, e.EmailID AS LoginEmail, ei.EmploymentNumber,
       u.UserName, u.UserEmail, u.RoleID
FROM dbo.TUsers u
JOIN dbo.TUserEmployee ue ON ue.UserID = u.UserID
JOIN dbo.TEmployee e      ON e.EmployeeId = ue.EmployeeID
JOIN dbo.TEmployeeInfo ei ON ei.EmployeeId = e.EmployeeId
WHERE u.Employerid = @EmployerId;
