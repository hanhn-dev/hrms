
/****************************************************************************************************           Copyright : HRMS           Author    : Chatla Jagapathibabu             Date      : 16 NOV 2025           Module    : HRMS           Descripti
on :            Usage     : EXEC [dbo].[SP_Mydetails_Enhanced_GetEmpHistoryDetails]           Change History :              Name				    Date			  Description           Chatla Jagapathibabu  24-02-2026		BUGID131438 Chatla Jagapathibabu  09-03-2026		#128811 
Chatla Jagapathibabu  28-05-2026		#143449 Chatla Jagapathi Babu	02-06-26    BUG 144450 Chatla Jagapathi Babu	11-06-26    BUG 145178 *****************************************************************************************************/
CREATE    
     PROCEDURE [dbo].[SP_Mydetails_Enhanced_GetEmpHistoryDetails] (     @EmployeeId INT,     @section    VARCHAR(MAX) = NULL,     @PageNumber INT          = NULL,      @PageSize   INT          = NULL,     @FromDate   DATETIME     = NULL,     @Todate     D
ATETIME     = NULL,     @TypeOfData VARCHAR
(50)  = NULL,      -- NEW: comma-separated list of Field names to keep from Changes JSON     @FieldsCsv  NVARCHAR(MAX) = NULL ) AS BEGIN     SET NOCOUNT ON;      IF @TypeOfData IS NULL SET @TypeOfData = 'History'
;
SET @PageNumber = ISNULL(@PageNumber, 1);
SET @PageSize   = ISNULL(@PageSize,   30);
DROP TABLE IF EXISTS #EmpHistorydetails;
CREATE TABLE #EmpHistorydetails
(
  [TimeStamp] DATETIME,
  [Editor]    VARCHAR(100),
  [Section]   VARCHAR(50),
  [Changes]   NVARCHAR(MAX)
);
IF @TypeOfData = 'History'     BEGIN
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes])
  EXEC SP_Mydetails_Enhanced_GetEmpSkillHistoryDetails @Empl
oyeeId;
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes])
  EXEC SP_Mydetails_Enhanced_GetEmpCurrentEmploymentHistoryDetails @EmployeeId;
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes
])
  EXEC SP_Mydetails_Enhanced_GetEmpPersonalHistoryDetails @EmployeeId;
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes])
  EXEC SP_Mydetails_Enhanced_GetEmpDomainHistoryDetails @EmployeeId;
  INSERT IN
TO
  #EmpHistorydetails([TimeStamp],[Editor],[Section],[Changes]
  )
  EXEC SP_Mydetails_Enhanced_GetEmpPassportHistoryDetails @EmployeeId;
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes])
  EXEC SP_Mydetails_Enhanc
ed_GetEmpVisaHistoryDetails
  @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpEmergencyContactHistoryDetails @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeSt
amp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpBankHistoryDetails @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpEducationHistoryDetails 
@EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpCertificationHistoryDetails @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Change
s])
EXEC SP_Mydetails_Enhanced_GetEmpTPastEmploymentHistoryDetails @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpNominationHistoryDetails @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpFamilyHistoryDetails @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydeta
ils_Enhanced_GetEmpContactHistoryDetails
@EmployeeId;
END     ELSE
IF @TypeOfData = 'Future'     BEGIN
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes])
  EXEC SP_Mydetails_Enhanced_GetEmpCurrentEmploymentfutureDet
ails
  @EmployeeId;
END     ELSE
IF @TypeOfData = 'Pending'     BEGIN
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes])
  EXEC SP_Mydetails_Enhanced_GetEmpSkillHistoryDetails_Pending @EmployeeId
  INSERT INTO #EmpHistoryd
  etails([TimeStamp],[Editor],[Section],[Changes]
  )
  EXEC SP_Mydetails_Enhanced_GetEmpDomainHistoryDetails_Pending @EmployeeId
  INSERT INTO #EmpHistorydetails
    ([TimeStamp],[Editor],[Section],[Changes])
  EXEC SP_Mydetails_Enhanced_GetEmpEmer
gencyContactHistoryDetails_pending
  @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpPersonalHistoryDetails_Pending @EmployeeId;
INSERT INTO #EmpHistorydetails
  (
  [TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpPassportHistoryDetails_Pending @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpVisaH
istoryDetails_Pending
@EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpCurrentEmploymentHistoryDetails_Pending @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([Tim
eStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpEducationHistoryDetails_Pending @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpFamilyHi
storyDetails_Pending
@EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpTPastEmploymentHistoryDetails_Pending @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeSt
amp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpNominationHistoryDetails_Pending @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpCertificat
ionHistoryDetails_Pending
@EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpBankHistoryDetails_Pending @EmployeeId;
INSERT INTO #EmpHistorydetails
  ([TimeStamp],[
Editor],[Section],[Changes])
EXEC SP_Mydetails_Enhanced_GetEmpContactHistoryDetails_Pending @EmployeeId;
END      /* ======== NEW: pre-filter rows by date + section for performance ======== */     ;
WITH
  SectionFilter
  AS
  (
    SELECT LT
RIM
  (RTRIM
(value)) AS SectionName         FROM STRING_SPLIT
(@section, ',')         WHERE @section IS NOT NULL     ),     Base AS
(         SELECT h.[TimeStamp], h.[Editor], h.[Section], h.[Changes]
FROM #EmpHistorydetails AS h
WHERE (@F
romDate IS NULL OR h.[TimeStamp] >= @FromDate)           AND
(@Todate   IS NULL OR h.[TimeStamp] < DATEADD
(DAY, 1, @Todate))   -- inclusive end-date           AND (                 @section IS NULL                 OR EXISTS (SELECT 1                      
      FROM SectionFilter s                            WHERE s.SectionName = h.[Section])               )           AND ISJSON
(h.[Changes]) = 1     ),     /* Split @FieldsCsv once */     Fields AS
(         SELECT DISTINCT LTRIM(RTRIM(value)) AS FieldN
ame         FROM STRING_SPLIT
(@FieldsCsv, ',')         WHERE @FieldsCsv IS NOT NULL     )
/* ======== Rebuild filtered Changes JSON per row when @FieldsCsv is provided ======== */
SELECT b.[TimeStamp], b.[Editor], b.[Sectio
n], [Changes] =             CASE                 WHEN @FieldsCsv IS NULL THEN b.[Changes]                 ELSE (                     SELECT j.Field, j.OldValue, j.NewValue,
    j.ChangeType
  FROM OPENJSON(b.[Changes])                     WITH                   (                         Field      NVARCHAR(200)  '$.Field',                         OldValue   NVARCHAR(4000) '$.OldValue',                   
      NewValue   NVARCHAR(4000) '$.NewValue',                         ChangeType NVARCHAR(50)   '$.ChangeType'                     ) AS j JOIN Fields f ON j.Field = f.FieldName
  FOR JSON PATH   
              )             END
INTO #Result
FROM Base AS b
WHERE         @FieldsCsv IS NULL OR EXISTS         (             SELECT 1
  FROM OPENJSON(b.[Changes])             WITH (Field NVARCHAR(200) '$.Field') AS j
    JOIN Fields f ON j.Field = f.FieldName         );
/* ======== Count after all filters ======== */
SELECT COUNT(*) AS TotalCount
FROM #Result;
/* ======== Paged data ======== */
SELECT [TimeStamp], [Editor], [Section
], [Changes]
FROM #Result
ORDER BY [TimeStamp] DESC     OFFSET
(@PageNumber - 1) * @PageSize ROWS
FETCH NEXT @PageSize ROWS ONLY;
END 
