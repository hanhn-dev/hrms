DECLARE @EmployeeId INT = 1431,
        @Month INT = 6,
        @Year INT = 2024;
EXEC SP_DB_EmployeeAttendanceDetails @EmployeeId, @Month, @Year

SELECT TOP 10 * FROM TEmployerDetails WHERE EmployerId = 10

EXEC SP_GetOrg_StartDayOfWeek 10
    
-- UPDATE tEmployerDetails
-- SET StartDayOfWeek  = 'Wednesday' 
-- WHERE EmployerId = 10

-- GO 

-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-05-01','2023-05-30',1431,'AttendanceJob'

-- GO 

-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-06-01','2023-06-31',1431,'AttendanceJob'

-- GO 

-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-07-01','2023-07-30',1431,'AttendanceJob'

-- GO 

-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-08-01','2023-08-31',1431,'AttendanceJob'

-- GO 

-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-09-01','2023-09-30',1431,'AttendanceJob'

-- GO 

-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-10-01','2023-10-31',1431,'AttendanceJob'

-- GO 

-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-11-01','2023-11-30',1431,'AttendanceJob'

-- GO 
-- EXEC [dbo].[USP_CalculateDailyAttendance] '2023-12-01','2023-12-31',1431,'AttendanceJob'
-- GO 
-- EXEC [dbo].[USP_CalculateDailyAttendance] '2024-01-01','2024-01-31',1431,'AttendanceJob'
-- GO 
-- EXEC [dbo].[USP_CalculateDailyAttendance] '2024-02-01','2024-02-29',1431,'AttendanceJob'
 
 