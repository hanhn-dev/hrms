DECLARE @Module VARCHAR(100) = 'DSH',
        @EmployeeId INT = 1431,
        @NotificationFor VARCHAR(20) = 'ForMe';

EXEC SP_CM_GetNotificationCnt @Module, @EmployeeId, @NotificationFor

EXEC USP_GET_THomePageNotificationCategory 10