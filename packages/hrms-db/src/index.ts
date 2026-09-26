export { createHrmsDb, checkDatabase, type HrmsDb } from "./shared/client";
export { hrmsDbConfigSchema, toMssqlConfig, type HrmsDbConfig } from "./shared/config";
export { asIso } from "./shared/iso";

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
  loadEmployeeAccess,
  type EmployeeAccess,
  type TabMasterCheck,
  type TenantRoleOption,
  assignUserRole,
  grantRevokeUserAccess,
  listUserPageRows,
  listUserRolePreview,
  menuIdsForGrant,
  type GrantRevokeMode,
  type TabRight,
} from "./employee/access";

export {
  requireResolvedEmployee,
  resolveEmployee,
  type ResolvedEmployee,
} from "./shared/employee";
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
} from "./employer/picker";
export {
  getEmployerSettings,
  listLicensedModules,
  type EmployerSettings,
  type LicensedModule,
} from "./employer/settings";
export {
  compareEmployerFieldsToTemplate,
  listEmployerFields,
  listFieldTemplate,
  getEmployerFieldValidationPreview,
  updateEmployerFieldValidationRule,
  VALIDATION_RULE_MAX_LENGTH,
  parseValidationRuleJson,
  validateValidationRuleValue,
  type FieldCatalogRow,
  type FieldCompareRow,
  type FieldCompareStatus,
  type ValidationRuleParseResult,
} from "./employer/fields";

export {
  listRolePageGrants,
  listRoles,
  type RolePageGrant,
  type RoleRow,
} from "./employer/roles";
