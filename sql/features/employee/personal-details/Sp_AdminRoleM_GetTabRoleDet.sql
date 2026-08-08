DECLARE @UserRoleId INT = 1,
        @EmployerId INT = 10;

EXEC Sp_AdminRoleM_GetTabRoleDet @EmployerId, @UserRoleId;
EXEC Sp_AdminRoleM_GetDynamicPageAccessMenuItems @EmployerId, @UserRoleId;