SELECT 
  missix.index_handle,
  t.name,
  missix.equality_columns,
  missix.inequality_columns,
  missix.[statement]
FROM sys.dm_db_missing_index_details missix
INNER JOIN sys.tables t ON t.object_id = missix.object_id


SELECT TOP 100 * FROM TEmployeeDetail_Section


SELECT TOP 100 * FROM TEmployeeDetail_Fields WHERE DisplayText LIKE 'Acquired Qualification' AND EmployerId = 10

SELECT TOP 100 ValidationRule, * FROM TEmployeeDetail_Fields WHERE DisplayText LIKE '%Person Mobile%' AND SectionID = 6 AND EmployerId = 10

sp_helptext 'SP_Mydetails_Enhanced_GetEmpHistoryDetails'
