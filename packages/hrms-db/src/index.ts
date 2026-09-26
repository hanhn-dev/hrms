export { createHrmsDb, checkDatabase, type HrmsDb } from "./client";
export { hrmsDbConfigSchema, toMssqlConfig, type HrmsDbConfig } from "./config";
export { asIso } from "./iso";

export {
  ancestorMenuIds,
  attachTabsToMenuTree,
  buildMenuAccessTree,
  buildTabAccessTree,
  collectExpandableKeys,
  menuKey,
  parseAccessKey,
  tabKey,
  type AccessNode,
  type AccessRow,
  type GrantFlag,
  type MenuAccessRow,
  type TabAccessRow,
} from "./access/tree";
export {
  loadEmployeeAccess,
  type EmployeeAccess,
  type TabMasterCheck,
  type TenantRoleOption,
} from "./access/load";
export {
  assignUserRole,
  grantRevokeUserAccess,
  listUserPageRows,
  listUserRolePreview,
  menuIdsForGrant,
  type GrantRevokeMode,
  type TabRight,
} from "./access/writes";

export {
  requireResolvedEmployee,
  resolveEmployee,
  type ResolvedEmployee,
} from "./employee/resolve";
export { searchEmployees, type EmployeeSearchHit } from "./employee/search";
export { getEmployeeProfile, type EmployeeProfile } from "./employee/profile";
export {
  getEmployeeLoginInfo,
  listUnlockPreview,
  unlockUserAccount,
  type EmployeeLoginInfo,
  type FailedLoginAttempt,
} from "./employee/login";
export {
  getEmployeeLeaveBalances,
  type LeaveBalanceRow,
} from "./employee/leave";

export {
  getDatabaseHealth,
  listEmployers,
  type EmployerListItem,
} from "./employers/list";
export {
  getEmployerSettings,
  listLicensedModules,
  type EmployerSettings,
  type LicensedModule,
} from "./employers/settings";

export {
  listRolePageGrants,
  listRoles,
  type RolePageGrant,
  type RoleRow,
} from "./roles/list";
