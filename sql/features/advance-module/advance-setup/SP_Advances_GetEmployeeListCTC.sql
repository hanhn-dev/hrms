DECLARE @EmployerId INT = 10,
        @Entity_FLAG CHAR(1) = 'G',
        @Entity_Value VARCHAR(100) = '10';

EXEC SP_Advances_GetEmployeeListCTC @EmployerId, @Entity_FLAG, @Entity_Value


SELECT * FROM TGrade WHERE Employerid = 10