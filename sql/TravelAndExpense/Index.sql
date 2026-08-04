EXEC Sp_TnE_ViewExpenseRequest 8279, 10, 1710

EXEC Sp_TnE_GetAllExpenseRequests 1430, 10, 'E', NULL


SELECT TOP 10 * FROM TEXPENSE_PAYMENT ORDER BY BillDate DESC;

SELECT TOP 10 * FROM TEXPENSE_STATUS

SELECT IsSingleApprovalForTravelRequest, SkipAcknowledgmentByAccountant
			FROM TTNEEmployerConfiguration
			WHERE EmployerID = 10


SELECT DISTINCT
       o.name AS Object_Name,
       o.type_desc
FROM sys.sql_modules m
       INNER JOIN
       sys.objects o
         ON m.object_id = o.object_id
WHERE m.definition Like '%by %';


SELECT TOP 10 * FROM VE_TNE_ExpenseDetails 

SELECT TOP 100 * FROM tExpense ORDER BY CreatedOn DESC

SELECT * FROM tRequestWorkflows where RequestTransID = 10381 and RequestType = 'ExpenseRequest'
SELECT * FROM TWorkflowManagement WHERE WorkflowId = 282


SELECT OBJECTPROPERTYEX(OBJECT_ID('tRequestWorkflows'), 'BaseType') AS BaseType; 

SELECT * FROM sys.tables WHERE name = 'tRequestWorkflows'
SELECT * FROM sys.objects WHERE type = 'U';

EXEC sp_help 'tRequestWorkflows'
select * from sys.synonyms where name = 'tRequestWorkflows'

