import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { resolveEmployee } from "../../shared/employee";
import { asBool, splitCsvIds } from "../../employer/workflows/helpers";
import {
  assembleEmployeeApproverRows,
  selectApplicableWorkflows,
  type ApproverDetail,
  type ApproverPage,
  type ApproverPerson,
  type ApproverWorkflow,
  type EmployeeApproverRow,
  type WorkflowGroupApprovers,
} from "./select";

export type EmployeeApproverPerson = ApproverPerson;
export type { EmployeeApproverRow };

export type EmployeeApprovers = {
  employeeId: number;
  employmentNumber: string;
  fullName: string;
  locationName: string | null;
  businessUnitName: string | null;
  functionalManager: ApproverPerson | null;
  reportingManager: ApproverPerson | null;
  rows: EmployeeApproverRow[];
};

type ContextRow = {
  FullName: string | null;
  EmploymentNumber: string | null;
  LocationId: number | null;
  BusinessUnitId: number | null;
  LocationName: string | null;
  BusinessUnitName: string | null;
  FunctionalManager: number | null;
  FunctionalManagerName: string | null;
  FunctionalEmploymentNumber: string | null;
  ReportsTo: number | null;
  ReportsToName: string | null;
  ReportsEmploymentNumber: string | null;
};

type WorkflowRow = {
  WorkflowId: number;
  WorkflowName: string | null;
  MappedPages: string | null;
  Isdefault: boolean | number | null;
  IsWorkflowPartial: boolean | number | null;
  SkipWorkFlow: boolean | number | null;
  IsEnableAutoApproved: boolean | number | null;
  IsNotificationOnlyWorkFlow: boolean | number | null;
};

type ScopeRow = {
  WorkFlowID: number;
  ScopeId: number;
};

type PageRow = {
  ModulePageId: number;
  ModulePageName: string | null;
  ModuleName: string | null;
};

type DetailRow = {
  WorkflowId: number;
  ManagerId: number | null;
  WorkflowRole: string | null;
  RoutingLevels: number | null;
};

type PersonRow = {
  EmployeeId: number;
  FullName: string | null;
  EmploymentNumber: string | null;
};

type GroupMemberRow = PersonRow & {
  RoleId: number;
  RoleName: string | null;
};

export async function listEmployeeApprovers(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
): Promise<EmployeeApprovers | null> {
  const tenantId = parseEmployerId(employerId);
  const identity = await resolveEmployee(db, tenantId, employmentNumber);
  if (!identity) {
    return null;
  }

  const [contextRows, settingRows, workflowRows] = await Promise.all([
    loadContext(db, tenantId, identity.employeeId),
    db.$queryRaw<Array<{ AllowPartialWorkflow: boolean | number | null }>>`
      SELECT Settings.AllowPartialWorkflow
      FROM dbo.TCustomerSettings AS Settings
      WHERE Settings.EmployerId = ${tenantId}
    `,
    db.$queryRaw<WorkflowRow[]>`
      SELECT
          Workflow.WorkflowId,
          Workflow.WorkflowName,
          Workflow.MappedPages,
          Workflow.Isdefault,
          Workflow.IsWorkflowPartial,
          Workflow.SkipWorkFlow,
          Workflow.IsEnableAutoApproved,
          Workflow.IsNotificationOnlyWorkFlow
      FROM dbo.TWorkflowManagement AS Workflow
      WHERE Workflow.Employerid = ${tenantId}
          AND ISNULL(Workflow.IsDelete, 0) = 0
          AND ISNULL(Workflow.isenable, 0) = 1
    `,
  ]);
  const context = contextRows[0];
  if (!context) {
    return null;
  }

  const workflows = uniqueWorkflows(workflowRows);
  const workflowIds = workflows.map((workflow) => workflow.workflowId);
  const [locationRows, businessUnitRows, pages, details] = await Promise.all([
    loadScope(db, workflowIds, "location"),
    loadScope(db, workflowIds, "business-unit"),
    loadPages(db, workflows.flatMap((workflow) => workflow.pageIds)),
    loadDetails(db, workflowIds),
  ]);
  const locationIds = groupScope(locationRows);
  const businessUnitIds = groupScope(businessUnitRows);
  const definedWorkflows = workflows.map((workflow) => ({
    ...workflow,
    locationIds: locationIds.get(workflow.workflowId) ?? [],
    businessUnitIds: businessUnitIds.get(workflow.workflowId) ?? [],
  }));
  const locationId = positiveId(context.LocationId);
  const businessUnitId = positiveId(context.BusinessUnitId);
  const selection = selectApplicableWorkflows({
    workflows: definedWorkflows,
    locationId,
    businessUnitId,
    allowPartialWorkflow: settingRows[0]?.AllowPartialWorkflow ?? null,
  });
  const matchedIds = new Set(selection.matches.map((match) => match.workflow.workflowId));
  const matchedDetails = details.filter((detail) => matchedIds.has(detail.workflowId));
  const resolved = await resolvePeople(db, tenantId, {
    businessUnitId,
    locationId,
    details: matchedDetails,
  });
  const initiator = personFrom(
    identity.employeeId,
    context.FullName,
    context.EmploymentNumber,
  );

  return {
    employeeId: identity.employeeId,
    employmentNumber: identity.employmentNumber,
    fullName: context.FullName?.trim() || identity.fullName,
    locationName: blankToNull(context.LocationName),
    businessUnitName: blankToNull(context.BusinessUnitName),
    functionalManager: personFrom(
      context.FunctionalManager,
      context.FunctionalManagerName,
      context.FunctionalEmploymentNumber,
    ),
    reportingManager: personFrom(
      context.ReportsTo,
      context.ReportsToName,
      context.ReportsEmploymentNumber,
    ),
    rows: assembleEmployeeApproverRows({
      pages,
      details: matchedDetails,
      selection,
      groups: resolved.groups,
      businessUnitHeads: resolved.businessUnitHeads,
      recruitmentAdmins: resolved.recruitmentAdmins,
      functionalManager: personFrom(
        context.FunctionalManager,
        context.FunctionalManagerName,
        context.FunctionalEmploymentNumber,
      ),
      reportingManager: personFrom(
        context.ReportsTo,
        context.ReportsToName,
        context.ReportsEmploymentNumber,
      ),
      initiator: initiator ?? {
        employeeId: identity.employeeId,
        name: identity.fullName,
        employmentNumber: identity.employmentNumber,
      },
      hasBusinessUnit: businessUnitId != null,
    }),
  };
}

async function loadContext(
  db: HrmsDb,
  employerId: number,
  employeeId: number,
): Promise<ContextRow[]> {
  return db.$queryRaw<ContextRow[]>`
    SELECT
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        EmployeeInfo.EmploymentNumber,
        EmployeeInfo.LocationId,
        EmployeeInfo.BusinessUnitId,
        Location.LocationName,
        BusinessUnit.UnitName AS BusinessUnitName,
        EmployeeInfo.FunctionalManager,
        LTRIM(RTRIM(CONCAT_WS(' ', FunctionalEmployee.FName, FunctionalEmployee.MiddleName, FunctionalEmployee.LName))) AS FunctionalManagerName,
        FunctionalInfo.EmploymentNumber AS FunctionalEmploymentNumber,
        OrgChart.ReportsTo,
        LTRIM(RTRIM(CONCAT_WS(' ', ReportsEmployee.FName, ReportsEmployee.MiddleName, ReportsEmployee.LName))) AS ReportsToName,
        ReportsInfo.EmploymentNumber AS ReportsEmploymentNumber
    FROM dbo.TEmployee AS Employee
    INNER JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    LEFT JOIN dbo.TLocation AS Location
        ON Location.LocationId = EmployeeInfo.LocationId
    LEFT JOIN dbo.TOrgHierarchyDetails AS BusinessUnit
        ON BusinessUnit.UnitID = EmployeeInfo.BusinessUnitId
    LEFT JOIN dbo.TEmployee AS FunctionalEmployee
        ON FunctionalEmployee.EmployeeId = EmployeeInfo.FunctionalManager
    LEFT JOIN dbo.TEmployeeInfo AS FunctionalInfo
        ON FunctionalInfo.EmployeeId = FunctionalEmployee.EmployeeId
    LEFT JOIN dbo.TORGChart AS OrgChart
        ON OrgChart.EmployeeID = Employee.EmployeeId
    LEFT JOIN dbo.TEmployee AS ReportsEmployee
        ON ReportsEmployee.EmployeeId = OrgChart.ReportsTo
    LEFT JOIN dbo.TEmployeeInfo AS ReportsInfo
        ON ReportsInfo.EmployeeId = ReportsEmployee.EmployeeId
    WHERE Employee.EmployeeId = ${employeeId}
        AND Employee.Employerid = ${employerId}
  `;
}

function uniqueWorkflows(rows: WorkflowRow[]): Array<Omit<ApproverWorkflow, "locationIds" | "businessUnitIds">> {
  const unique = new Map<number, Omit<ApproverWorkflow, "locationIds" | "businessUnitIds">>();
  for (const row of rows) {
    if (unique.has(row.WorkflowId)) {
      continue;
    }
    unique.set(row.WorkflowId, {
      workflowId: row.WorkflowId,
      workflowName: row.WorkflowName?.trim() || `Workflow ${row.WorkflowId}`,
      isDefault: asBool(row.Isdefault),
      isPartial: asBool(row.IsWorkflowPartial),
      skipWorkFlow: asBool(row.SkipWorkFlow),
      autoApproved: asBool(row.IsEnableAutoApproved),
      notificationOnly: asBool(row.IsNotificationOnlyWorkFlow),
      pageIds: splitCsvIds(row.MappedPages),
    });
  }
  return [...unique.values()];
}

async function loadScope(
  db: HrmsDb,
  workflowIds: number[],
  kind: "location" | "business-unit",
): Promise<ScopeRow[]> {
  if (workflowIds.length === 0) {
    return [];
  }
  const ids = Prisma.join(workflowIds);
  if (kind === "location") {
    return db.$queryRaw<ScopeRow[]>`
      SELECT Mapping.WorkFlowID, Mapping.LocationID AS ScopeId
      FROM dbo.TWorkFlowLocations AS Mapping
      WHERE Mapping.WorkFlowID IN (${ids})
    `;
  }
  return db.$queryRaw<ScopeRow[]>`
    SELECT Mapping.WorkFlowID, Mapping.BusinessUnitID AS ScopeId
    FROM dbo.TWorkFlowBusinessUnits AS Mapping
    WHERE Mapping.WorkFlowID IN (${ids})
  `;
}

function groupScope(rows: ScopeRow[]): Map<number, number[]> {
  const grouped = new Map<number, number[]>();
  for (const row of rows) {
    const scopeId = positiveId(row.ScopeId);
    if (scopeId == null) {
      continue;
    }
    const list = grouped.get(row.WorkFlowID) ?? [];
    if (!list.includes(scopeId)) {
      list.push(scopeId);
    }
    grouped.set(row.WorkFlowID, list);
  }
  return grouped;
}

async function loadPages(db: HrmsDb, pageIds: number[]): Promise<ApproverPage[]> {
  const unique = [...new Set(pageIds.filter((id) => id > 0))];
  if (unique.length === 0) {
    return [];
  }
  const rows = await db.$queryRaw<PageRow[]>`
    SELECT
        Page.ModulePageId,
        Page.ModulePageName,
        Module.ModuleName
    FROM dbo.TModulePages AS Page
    LEFT JOIN dbo.THrmsModules AS Module
        ON Module.ModuleId = Page.PageModuleId
    WHERE Page.ModulePageId IN (${Prisma.join(unique)})
  `;
  return rows.map((row) => ({
    pageId: row.ModulePageId,
    pageName: row.ModulePageName?.trim() || `Page ${row.ModulePageId}`,
    moduleName: row.ModuleName?.trim() || "—",
  }));
}

async function loadDetails(db: HrmsDb, workflowIds: number[]): Promise<ApproverDetail[]> {
  if (workflowIds.length === 0) {
    return [];
  }
  const rows = await db.$queryRaw<DetailRow[]>`
    SELECT
        Detail.WorkflowId,
        Detail.ManagerId,
        Detail.WorkflowRole,
        Detail.RoutingLevels
    FROM dbo.TWorkflowDetails AS Detail
    WHERE Detail.WorkflowId IN (${Prisma.join(workflowIds)})
        AND ISNULL(Detail.IsDelete, 0) = 0
        AND ISNULL(Detail.WorkflowRole, '') <> ''
    ORDER BY Detail.RoutingLevels, Detail.WorkflowDetailId
  `;
  return rows.flatMap((row) => {
    const roleCode = row.WorkflowRole?.trim() ?? "";
    const level = Number(row.RoutingLevels);
    if (!roleCode || !Number.isInteger(level)) {
      return [];
    }
    return [
      {
        workflowId: row.WorkflowId,
        managerId: Number(row.ManagerId) || 0,
        roleCode,
        level,
      },
    ];
  });
}

async function resolvePeople(
  db: HrmsDb,
  employerId: number,
  input: {
    businessUnitId: number | null;
    locationId: number | null;
    details: ApproverDetail[];
  },
): Promise<{
  groups: Map<number, WorkflowGroupApprovers>;
  businessUnitHeads: ApproverPerson[];
  recruitmentAdmins: ApproverPerson[];
}> {
  const roleIds = [
    ...new Set(
      input.details
        .filter((detail) => detail.roleCode.trim().toUpperCase() === "U" && detail.managerId > 0)
        .map((detail) => detail.managerId),
    ),
  ];
  const needsHeads = input.details.some(
    (detail) => detail.roleCode.trim().toUpperCase() === "M",
  );
  const needsAdmins = input.details.some(
    (detail) => detail.roleCode.trim().toUpperCase() === "B",
  );
  const [groups, businessUnitHeads, recruitmentAdmins] = await Promise.all([
    loadGroups(db, roleIds, input.locationId, input.businessUnitId),
    needsHeads ? loadBusinessUnitHeads(db, employerId, input.businessUnitId) : Promise.resolve([]),
    needsAdmins ? loadRecruitmentAdmins(db, employerId) : Promise.resolve([]),
  ]);
  return { groups, businessUnitHeads, recruitmentAdmins };
}

async function loadGroups(
  db: HrmsDb,
  roleIds: number[],
  locationId: number | null,
  businessUnitId: number | null,
): Promise<Map<number, WorkflowGroupApprovers>> {
  const groups = new Map<number, WorkflowGroupApprovers>();
  if (roleIds.length === 0) {
    return groups;
  }
  const roles = await db.$queryRaw<Array<{ RoleId: number; RoleName: string | null }>>`
    SELECT RoleGroup.RoleId, RoleGroup.RoleName
    FROM dbo.TRoleManagement AS RoleGroup
    WHERE ISNULL(RoleGroup.IsDelete, 0) = 0
        AND RoleGroup.RoleId IN (${Prisma.join(roleIds)})
  `;
  for (const roleId of roleIds) {
    const role = roles.find((row) => row.RoleId === roleId);
    groups.set(roleId, {
      roleName: role?.RoleName?.trim() || `Role ${roleId}`,
      people: [],
    });
  }
  if (locationId == null || businessUnitId == null) {
    return groups;
  }
  const members = await db.$queryRaw<GroupMemberRow[]>`
    SELECT
        Mapping.Roleid AS RoleId,
        RoleGroup.RoleName,
        Employee.EmployeeId,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        EmployeeInfo.EmploymentNumber
    FROM dbo.tRoleEmployeeMapping AS Mapping
    INNER JOIN dbo.tRoleLocationMapping AS LocationMap
        ON LocationMap.Roleid = Mapping.Roleid
        AND LocationMap.Locationid = ${locationId}
    INNER JOIN dbo.tRoleBusinessUnitMapping AS BusinessMap
        ON BusinessMap.Roleid = Mapping.Roleid
        AND BusinessMap.Businessunitid = ${businessUnitId}
    INNER JOIN dbo.TEmployee AS Employee
        ON Employee.EmployeeId = Mapping.Employeeid
    LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    LEFT JOIN dbo.TRoleManagement AS RoleGroup
        ON RoleGroup.RoleId = Mapping.Roleid
    WHERE Mapping.Roleid IN (${Prisma.join(roleIds)})
    ORDER BY FullName, Employee.EmployeeId
  `;
  for (const member of members) {
    const group = groups.get(member.RoleId);
    const person = personFrom(member.EmployeeId, member.FullName, member.EmploymentNumber);
    if (!group || !person || group.people.some((existing) => existing.employeeId === person.employeeId)) {
      continue;
    }
    if (member.RoleName?.trim()) {
      group.roleName = member.RoleName.trim();
    }
    group.people.push(person);
  }
  return groups;
}

async function loadBusinessUnitHeads(
  db: HrmsDb,
  employerId: number,
  businessUnitId: number | null,
): Promise<ApproverPerson[]> {
  if (businessUnitId == null) {
    return [];
  }
  const present = await db.$queryRaw<Array<{ Id: number | null }>>`
    SELECT OBJECT_ID('dbo.TEmployeeOrgBusinessHead', 'U') AS Id
  `;
  if (present[0]?.Id == null) {
    return [];
  }
  const rows = await db.$queryRaw<PersonRow[]>`
    SELECT DISTINCT
        Head.EmployeeId,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        EmployeeInfo.EmploymentNumber
    FROM dbo.TEmployeeOrgBusinessHead AS Head
    INNER JOIN dbo.TEmployee AS Employee
        ON Employee.EmployeeId = Head.EmployeeId
    LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    WHERE Head.BusinessUnitId = ${businessUnitId}
        AND Head.EmployerID = ${employerId}
        AND ISNULL(Head.IsActive, 1) = 1
        AND Head.EmployeeId IS NOT NULL
    ORDER BY FullName, Head.EmployeeId
  `;
  return uniquePeople(rows);
}

async function loadRecruitmentAdmins(
  db: HrmsDb,
  employerId: number,
): Promise<ApproverPerson[]> {
  const roles = await db.$queryRaw<Array<{ RoleID: number }>>`
    SELECT TOP (1) Roles.RoleID
    FROM dbo.TRoles AS Roles
    WHERE Roles.RoleType = 'RecruitmentAdmin'
        AND Roles.IsActive = 'Y'
        AND (
            Roles.Employerid = ${employerId}
            OR Roles.Employerid = 0
        )
    ORDER BY Roles.Employerid DESC
  `;
  const roleId = roles[0]?.RoleID;
  if (!roleId) {
    return [];
  }
  const rows = await db.$queryRaw<PersonRow[]>`
    SELECT
        Employee.EmployeeId,
        LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
        EmployeeInfo.EmploymentNumber
    FROM dbo.TUserEmployee AS UserEmployee
    INNER JOIN dbo.TUsers AS Users
        ON Users.UserID = UserEmployee.UserID
    INNER JOIN dbo.TEmployee AS Employee
        ON Employee.EmployeeId = UserEmployee.EmployeeID
    LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
        ON EmployeeInfo.EmployeeId = Employee.EmployeeId
    WHERE Users.RoleID = ${roleId}
        AND Users.Employerid = ${employerId}
    ORDER BY FullName, Employee.EmployeeId
  `;
  return uniquePeople(rows);
}

function uniquePeople(rows: PersonRow[]): ApproverPerson[] {
  const people: ApproverPerson[] = [];
  for (const row of rows) {
    const person = personFrom(row.EmployeeId, row.FullName, row.EmploymentNumber);
    if (!person || people.some((existing) => existing.employeeId === person.employeeId)) {
      continue;
    }
    people.push(person);
  }
  return people;
}

function personFrom(
  employeeId: number | null | undefined,
  name: string | null | undefined,
  employmentNumber: string | null | undefined,
): ApproverPerson | null {
  const id = positiveId(employeeId);
  if (id == null) {
    return null;
  }
  return {
    employeeId: id,
    name: name?.trim() || `Employee ${id}`,
    employmentNumber: blankToNull(employmentNumber),
  };
}

function positiveId(value: number | null | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
