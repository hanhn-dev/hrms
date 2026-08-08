DECLARE @EmployerId INT = 10,
        @Source VARCHAR = NULL;

EXEC USP_GET_tAttendanceCaptureMode @EmployerId, NULL 