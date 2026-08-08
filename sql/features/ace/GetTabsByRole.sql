DECLARE @RoleId INT = 1, -- Administrator: 1
        @EmployerId INT = 10;

-- Get Tabs for the specified Role.
EXEC Sp_AdminRoleM_GetTabRoleDet @EmployerId, @RoleId;

-- Get Menu Items for the specified Role
EXEC Sp_AdminRoleM_GetDynamicPageAccessMenuItems @EmployerId, @RoleId;