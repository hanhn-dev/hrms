DECLARE @AdvanceEmployeeDetailId INT = 5,
        @DocumentId VARCHAR(32) = 'DC319CE1A9C8429FA595B05E49681F49',
        @SequenceID INT = 1,
        @CreatedBy INT = 1430

EXEC SP_Advances_InsAdvanceDocuments @AdvanceEmployeeDetailId, @DocumentId, @SequenceID, @CreatedBy

SELECT * FROM tAdvances_AdvanceDocuments WHERE DocumentId = '58DF8F7342744DC9A82300FB46C7D327'
SELECT * FROM TDOCUMENTS WHERE DocumentID = '58DF8F7342744DC9A82300FB46C7D327'