-- String
DECLARE @firstName NVARCHAR(20) = 'Hanh',
       @lastName NVARCHAR(20) = 'Nguyen',
       @middleName NVARCHAR(20);

SELECT @firstName + IIF(@middleName IS NULL, '', ' ' + @middleName) + ' ' + @lastName
SELECT @firstName + CASE WHEN @middleName IS NULL THEN '' ELSE ' ' + @middleName END + ' ' + @lastName
SELECT @firstName + COALESCE(' ' + @middleName, '') + ' ' + @lastName
SELECT CONCAT(@firstName,' ',@middleName,' ', @lastName)

SELECT 'My coworker salary is ' + CONVERT(VARCHAR(20), 12345.6)
SELECT 'My coworker salary is ' + FORMAT(12345.6, 'C', 'en-GB')

-- Date
SELECT CURRENT_TIMESTAMP AS RightNow
SELECT GETDATE() AS RightNow
SELECT SYSDATETIME() AS RightNow
SELECT DATEADD(YEAR, 1, '2015-01-02 03:04:05') AS MyYear
SELECT DATEPART(HOUR, '2015-01-02 03:04:05') AS MyHour
SELECT DATEDIFF(SECOND, '2015-01-02 03:04:05', GETDATE()) as SecondsElapsed
SELECT DATENAME(WEEKDAY, GETDATE()) AS MyWeekDay

DECLARE @dateOffset AS DATETIMEOFFSET = '2015-06-25 01:02:03.456 +05:30',
       @date AS DATETIME2 = '2015-06-25 01:02:03.456';

SELECT TODATETIMEOFFSET(@date, '+05:30') AS DateOffset
SELECT DATETIMEOFFSETFROMPARTS(2015, 06, 25, 1, 2, 3, 456, 5, 30, 3) AS DateOffsetParts
SELECT SYSDATETIMEOFFSET() AS TimeNow
SELECT SYSUTCDATETIME() AS UTCTimeNow
SELECT SWITCHOFFSET(@dateOffset, '-05:00') AS MyTime
SELECT PARSE('Thursday, 25 June 2015' AS DATE) ParsedDate
SELECT PARSE('Jueves, 25 de junio de 2015' AS DATE USING 'es-ES') AS ParsedDate
SELECT FORMAT(CAST('2015-06-25 01:02:03.456' AS DATETIME), 'D') AS FormattedLongDate
SELECT FORMAT(CAST('2015-06-25 01:02:03.456' AS DATETIME), 'd') AS FormattedLongDate
SELECT FORMAT(CAST('2015-06-25 01:02:03.456' AS DATETIME), 'dd-MM-yyyy') AS FormattedLongDate
SELECT FORMAT(CAST('2015-06-25 01:02:03.456' AS DATETIME), 'D', 'es-ES') AS FormattedLongDate

-- TABLE
CREATE TABLE tblEmployee(
    EmployeeNumber INT NOT NULL,
    EmployeeFirstName NVARCHAR(50) NOT NULL,
    EmployeeMiddleName NVARCHAR(50) NULL,
    EmployeeLastName NVARCHAR(50) NOT NULL,
    EmployeeGovernmentId CHAR(10) NULL,
    DateOfBirth DATE NOT NULL
)

ALTER TABLE tblEmployee ADD Department VARCHAR(10);
ALTER TABLE tblEmployee DROP COLUMN Department;
ALTER TABLE tblEmployee ALTER COLUMN Department VARCHAR(20);

INSERT INTO tblEmployee
VALUES (132, 'Dylan', 'A', 'Word', 'HN513777D', '19920914', 'Customer Relations'),
(133, 'Dylan', 'A', 'Word', 'HN513777D', '19920914', 'Customer Relations'),
(134, 'Dylan', 'A', 'Word', 'HN513777D', '19920914', 'Customer Relations')

DROP TABLE tblEmployee;
