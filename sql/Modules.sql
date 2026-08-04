SELECT * FROM THrmsModules
SELECT * FROM TModulePages
SELECT * FROM TUSerPagesMapping
SELECT * FROM TRolePagesMapping
SELECT * FROM TTabDetails WHERE MenuId = 1168
SELECT * FROM TRoles
SELECT * FROM TUserTabDetails
SELECT * FROM TUsers

SELECT * FROM tMenuDetails WHERE Employerid = 10
-- UPDATE tMenuDetails SET NavigateURL = '/HRM/PreOnBoarding/FieldConfiguration.aspx' WHERE MenuId = 147 AND Employerid = 10;

IF NOT EXISTS (SELECT 1 FROM TtabDetails WHERE MENUID=1168 AND TabName='Access to Change File Protection')
BEGIN
INSERT INTO TtabDetails (Tabid,MenuId,TabName,Employerid,IsActive,CreatedBy,CreatedDate)
select 347,1168,'Access to Change File Protection',0,'Y',1,getdate()
END
GO


;WITH ADDED_ROW_NUMBERS AS (SELECT
    PLUM.POBLookupID,
    PLUM.LookupCategory,
    PLUM.DisplayText,
    PLUM.IsActive,
    ROW_NUMBER() OVER (PARTITION BY PLUM.POBLookupID ORDER BY PLUM.POBLookupID) AS RowNumber
FROM POBlookupmaster AS PLUM
INNER JOIN POBLookupEmployerMapping AS PLEM ON PLEM.POBLookupID = PLUM.POBLookupID
WHERE PLUM.TCategoryID = 3 AND PLEM.EmployerID = 10)

SELECT * FROM ADDED_ROW_NUMBERS WHERE RowNumber = 1


SELECT 
                            POBLookupID,
                            LookupCategory,
                            DisplayText,
                            IsActive
                        FROM POBlookupmaster WHERE TCategoryID=3

