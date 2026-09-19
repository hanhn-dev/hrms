-- Local DEV only. Drop the pre-rewrite Count SP clone after a clean compare.
IF EXISTS (SELECT 1 FROM SYS.PROCEDURES WHERE NAME = 'Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy')
BEGIN
  DROP PROCEDURE dbo.Sp_CM_Mydetails_DirectIndirectReports_Count_Legacy;
END
GO
