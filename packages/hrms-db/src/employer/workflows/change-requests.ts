import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { asIso } from "../../shared/iso";
import {
  changeRequestIdSchema,
  employeeIdSchema,
  parseEmployerId,
  workflowIdSchema,
} from "../../shared/ids";
import { asBool } from "./helpers";
import { getWorkflow } from "./get";
import {
  changeRequestStatus,
  pendingApproverFlag,
  type ChangeRequestStatus,
} from "./change-request-apply";
import {
  pickChangeRequestApprovers,
  type ChangeRequestApprover,
  type ChangeRequestQueueActor,
} from "./change-request-approvers";

const REQUEST_TYPE = "EmploymentTypeChange";

export type ChangeRequestListItem = {
  changeRequestId: number;
  employeeId: number;
  employeeName: string;
  employmentNumber: string | null;
  pageName: string | null;
  sectionNames: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdByEmploymentNumber: string | null;
  requestedDate: string | null;
  status: ChangeRequestStatus;
  workflowId: number | null;
  workflowName: string | null;
  approvers: ChangeRequestApprover[];
};

export type { ChangeRequestApprover };

export type ChangeRequestDetailRow = {
  changeDetailsId: number;
  sectionName: string | null;
  fieldName: string | null;
  dbFieldName: string | null;
  tableName: string | null;
  oldValue: string | null;
  newValue: string | null;
  isNew: boolean;
};

export type ChangeRequestQueueRow = {
  employeeId: number;
  name: string;
  employmentNumber: string | null;
  approvalLevel: number;
};

export type ChangeRequestDetail = {
  header: ChangeRequestListItem;
  details: ChangeRequestDetailRow[];
  pendingApprovers: ChangeRequestQueueRow[];
};

export type ConfiguredApproverPerson = {
  employeeId: number;
  name: string;
  employmentNumber: string | null;
  pending: boolean;
};

export type ConfiguredApproverGroup = {
  roleName: string;
  roleCode: string;
  people: ConfiguredApproverPerson[];
};

type HeaderRow = {
  ChangeRequestId: number;
  EmployeeId: number;
  EmployeeName: string | null;
  EmploymentNumber: string | null;
  PageName: string | null;
  SectionNames: string | null;
  CreatedBy: number | null;
  CreatedByName: string | null;
  CreatedByEmploymentNumber: string | null;
  RequestedDate: Date | string | null;
  IsApproved: boolean | number | null;
  WorkflowId: number | null;
  WorkflowName: string | null;
};

function mapHeader(
  row: HeaderRow,
  approvers: ChangeRequestApprover[] = [],
): ChangeRequestListItem {
  return {
    changeRequestId: row.ChangeRequestId,
    employeeId: row.EmployeeId,
    employeeName: row.EmployeeName?.trim() || `Employee ${row.EmployeeId}`,
    employmentNumber: row.EmploymentNumber,
    pageName: row.PageName,
    sectionNames: row.SectionNames,
    createdBy: row.CreatedBy,
    createdByName: row.CreatedByName?.trim() || null,
    createdByEmploymentNumber: row.CreatedByEmploymentNumber,
    requestedDate: asIso(row.RequestedDate),
    status: changeRequestStatus(row.IsApproved),
    workflowId: row.WorkflowId,
    workflowName: row.WorkflowName,
    approvers,
  };
}

type QueueActorSqlRow = {
  RequestTransid: number;
  ApproveStatus: string | null;
  ApprovalLevel: number | null;
  ManagerId: number | null;
  ManagerName: string | null;
  ManagerEmploymentNumber: string | null;
  UpdatedBy: number | null;
  UpdatedByName: string | null;
  UpdatedByEmploymentNumber: string | null;
};

function mapQueueActor(row: QueueActorSqlRow): ChangeRequestQueueActor {
  return {
    approveStatus: row.ApproveStatus,
    approvalLevel: row.ApprovalLevel,
    managerId: row.ManagerId,
    managerName: row.ManagerName,
    managerEmploymentNumber: row.ManagerEmploymentNumber,
    updatedBy: row.UpdatedBy,
    updatedByName: row.UpdatedByName,
    updatedByEmploymentNumber: row.UpdatedByEmploymentNumber,
  };
}

async function loadApproversByRequest(
  db: HrmsDb,
  changeRequestIds: number[],
): Promise<Map<number, ChangeRequestApprover[]>> {
  const unique = [...new Set(changeRequestIds)];
  const grouped = new Map<number, ChangeRequestQueueActor[]>();
  if (unique.length === 0) {
    return new Map();
  }
  const rows = await db.$queryRaw<QueueActorSqlRow[]>(Prisma.sql`
    SELECT
        Queue.RequestTransid,
        Queue.ApproveStatus,
        Queue.ApprovalLevel,
        Queue.ManagerId,
        LTRIM(RTRIM(CONCAT_WS(' ', Manager.FName, Manager.MiddleName, Manager.LName))) AS ManagerName,
        ManagerInfo.EmploymentNumber AS ManagerEmploymentNumber,
        Queue.UpdatedBy,
        LTRIM(RTRIM(CONCAT_WS(' ', Actor.FName, Actor.MiddleName, Actor.LName))) AS UpdatedByName,
        ActorInfo.EmploymentNumber AS UpdatedByEmploymentNumber
    FROM dbo.TRequestWorkflows AS Queue
    LEFT JOIN dbo.TEmployee AS Manager
        ON Manager.EmployeeId = Queue.ManagerId
    LEFT JOIN dbo.TEmployeeInfo AS ManagerInfo
        ON ManagerInfo.EmployeeId = Queue.ManagerId
    LEFT JOIN dbo.TEmployee AS Actor
        ON Actor.EmployeeId = Queue.UpdatedBy
    LEFT JOIN dbo.TEmployeeInfo AS ActorInfo
        ON ActorInfo.EmployeeId = Queue.UpdatedBy
    WHERE Queue.RequestType = ${REQUEST_TYPE}
        AND ISNULL(Queue.IsDeleted, 0) = 0
        AND Queue.RequestTransid IN (${Prisma.join(unique)})
    ORDER BY Queue.RequestTransid, Queue.ApprovalLevel, Queue.Transid
  `);
  for (const row of rows) {
    const actors = grouped.get(row.RequestTransid) ?? [];
    actors.push(mapQueueActor(row));
    grouped.set(row.RequestTransid, actors);
  }
  return new Map(
    unique.map((changeRequestId) => [
      changeRequestId,
      pickChangeRequestApprovers(grouped.get(changeRequestId) ?? []),
    ]),
  );
}

async function loadHeader(
  db: HrmsDb,
  employerId: number,
  changeRequestId: number,
): Promise<HeaderRow | null> {
  const rows = await db.$queryRaw<HeaderRow[]>`
    SELECT
        ChangeRequest.ChangeRequestId,
        ChangeRequest.EmployeeId,
        LTRIM(RTRIM(CONCAT_WS(' ', Subject.FName, Subject.MiddleName, Subject.LName))) AS EmployeeName,
        SubjectInfo.EmploymentNumber,
        ChangeRequest.PageName,
        (
            SELECT STRING_AGG(Sections.SectionName, ', ') WITHIN GROUP (ORDER BY Sections.SectionName)
            FROM (
                SELECT DISTINCT Detail.SectionName
                FROM dbo.TMyDetailsChangeRequestDetails AS Detail
                WHERE Detail.ChangeRequestId = ChangeRequest.ChangeRequestId
                    AND Detail.SectionName IS NOT NULL
            ) AS Sections
        ) AS SectionNames,
        ChangeRequest.CreatedBy,
        LTRIM(RTRIM(CONCAT_WS(' ', Requester.FName, Requester.MiddleName, Requester.LName))) AS CreatedByName,
        RequesterInfo.EmploymentNumber AS CreatedByEmploymentNumber,
        ChangeRequest.RequestedDate,
        ChangeRequest.IsApproved,
        (
            SELECT MAX(Queue.WorkflowId)
            FROM dbo.TRequestWorkflows AS Queue
            WHERE Queue.RequestTransid = ChangeRequest.ChangeRequestId
                AND Queue.RequestType = ${REQUEST_TYPE}
                AND ISNULL(Queue.IsDeleted, 0) = 0
        ) AS WorkflowId,
        (
            SELECT TOP (1) Management.WorkflowName
            FROM dbo.TRequestWorkflows AS Queue
            LEFT JOIN dbo.TWorkflowManagement AS Management
                ON Management.WorkflowId = Queue.WorkflowId
            WHERE Queue.RequestTransid = ChangeRequest.ChangeRequestId
                AND Queue.RequestType = ${REQUEST_TYPE}
                AND ISNULL(Queue.IsDeleted, 0) = 0
            ORDER BY Queue.Transid DESC
        ) AS WorkflowName
    FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
    INNER JOIN dbo.TEmployee AS Subject
        ON Subject.EmployeeId = ChangeRequest.EmployeeId
    LEFT JOIN dbo.TEmployeeInfo AS SubjectInfo
        ON SubjectInfo.EmployeeId = ChangeRequest.EmployeeId
    LEFT JOIN dbo.TEmployee AS Requester
        ON Requester.EmployeeId = ChangeRequest.CreatedBy
    LEFT JOIN dbo.TEmployeeInfo AS RequesterInfo
        ON RequesterInfo.EmployeeId = ChangeRequest.CreatedBy
    WHERE ChangeRequest.ChangeRequestId = ${changeRequestId}
        AND ChangeRequest.EmployerId = ${employerId}
  `;
  return rows[0] ?? null;
}

async function listChangeRequestHeaders(
  db: HrmsDb,
  employerId: number,
  employeeId: number | null,
): Promise<ChangeRequestListItem[]> {
  const tenantId = parseEmployerId(employerId);
  const subjectId = employeeId == null ? null : employeeIdSchema.parse(employeeId);
  const employeeFilter =
    subjectId == null
      ? Prisma.empty
      : Prisma.sql`AND ChangeRequest.EmployeeId = ${subjectId}`;
  const rows = await db.$queryRaw<HeaderRow[]>(Prisma.sql`
    SELECT
        ChangeRequest.ChangeRequestId,
        ChangeRequest.EmployeeId,
        LTRIM(RTRIM(CONCAT_WS(' ', Subject.FName, Subject.MiddleName, Subject.LName))) AS EmployeeName,
        SubjectInfo.EmploymentNumber,
        ChangeRequest.PageName,
        (
            SELECT STRING_AGG(Sections.SectionName, ', ') WITHIN GROUP (ORDER BY Sections.SectionName)
            FROM (
                SELECT DISTINCT Detail.SectionName
                FROM dbo.TMyDetailsChangeRequestDetails AS Detail
                WHERE Detail.ChangeRequestId = ChangeRequest.ChangeRequestId
                    AND Detail.SectionName IS NOT NULL
            ) AS Sections
        ) AS SectionNames,
        ChangeRequest.CreatedBy,
        LTRIM(RTRIM(CONCAT_WS(' ', Requester.FName, Requester.MiddleName, Requester.LName))) AS CreatedByName,
        RequesterInfo.EmploymentNumber AS CreatedByEmploymentNumber,
        ChangeRequest.RequestedDate,
        ChangeRequest.IsApproved,
        (
            SELECT MAX(Queue.WorkflowId)
            FROM dbo.TRequestWorkflows AS Queue
            WHERE Queue.RequestTransid = ChangeRequest.ChangeRequestId
                AND Queue.RequestType = ${REQUEST_TYPE}
                AND ISNULL(Queue.IsDeleted, 0) = 0
        ) AS WorkflowId,
        (
            SELECT TOP (1) Management.WorkflowName
            FROM dbo.TRequestWorkflows AS Queue
            LEFT JOIN dbo.TWorkflowManagement AS Management
                ON Management.WorkflowId = Queue.WorkflowId
            WHERE Queue.RequestTransid = ChangeRequest.ChangeRequestId
                AND Queue.RequestType = ${REQUEST_TYPE}
                AND ISNULL(Queue.IsDeleted, 0) = 0
            ORDER BY Queue.Transid DESC
        ) AS WorkflowName
    FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
    INNER JOIN dbo.TEmployee AS Subject
        ON Subject.EmployeeId = ChangeRequest.EmployeeId
    LEFT JOIN dbo.TEmployeeInfo AS SubjectInfo
        ON SubjectInfo.EmployeeId = ChangeRequest.EmployeeId
    LEFT JOIN dbo.TEmployee AS Requester
        ON Requester.EmployeeId = ChangeRequest.CreatedBy
    LEFT JOIN dbo.TEmployeeInfo AS RequesterInfo
        ON RequesterInfo.EmployeeId = ChangeRequest.CreatedBy
    WHERE ChangeRequest.EmployerId = ${tenantId}
    ${employeeFilter}
    ORDER BY ChangeRequest.ChangeRequestId DESC
  `);
  const approvers = await loadApproversByRequest(
    db,
    rows.map((row) => row.ChangeRequestId),
  );
  return rows.map((row) => mapHeader(row, approvers.get(row.ChangeRequestId) ?? []));
}

export async function listChangeRequests(
  db: HrmsDb,
  employerId: number,
): Promise<ChangeRequestListItem[]> {
  return listChangeRequestHeaders(db, employerId, null);
}

export async function listEmployeeChangeRequests(
  db: HrmsDb,
  employerId: number,
  employeeId: number,
): Promise<ChangeRequestListItem[]> {
  return listChangeRequestHeaders(db, employerId, employeeId);
}

export async function getChangeRequest(
  db: HrmsDb,
  employerId: number,
  changeRequestId: number,
): Promise<ChangeRequestDetail | null> {
  const tenantId = parseEmployerId(employerId);
  const parsedChangeRequestId = changeRequestIdSchema.parse(changeRequestId);
  const header = await loadHeader(db, tenantId, parsedChangeRequestId);
  if (!header) {
    return null;
  }

  const [details, pending, approvers] = await Promise.all([
    db.$queryRaw<
      Array<{
        ChangeDetailsId: number;
        SectionName: string | null;
        FieldName: string | null;
        DBFieldName: string | null;
        TableName: string | null;
        TextValueOld: string | null;
        TextValueNew: string | null;
        OldValue: string | null;
        NewValue: string | null;
        IsNew: boolean | number | null;
      }>
    >`
      SELECT
          Detail.ChangeDetailsId,
          Detail.SectionName,
          Detail.FieldName,
          Detail.DBFieldName,
          Detail.TableName,
          Detail.TextValueOld,
          Detail.TextValueNew,
          Detail.OldValue,
          Detail.NewValue,
          Detail.IsNew
      FROM dbo.TMyDetailsChangeRequestDetails AS Detail
      WHERE Detail.ChangeRequestId = ${parsedChangeRequestId}
      ORDER BY Detail.SectionName, Detail.FieldName, Detail.ChangeDetailsId
    `,
    db.$queryRaw<
      Array<{
        ManagerId: number;
        ApproverName: string | null;
        EmploymentNumber: string | null;
        ApprovalLevel: number;
      }>
    >`
      SELECT
          Queue.ManagerId,
          LTRIM(RTRIM(CONCAT_WS(' ', Approver.FName, Approver.MiddleName, Approver.LName))) AS ApproverName,
          ApproverInfo.EmploymentNumber,
          Queue.ApprovalLevel
      FROM dbo.TRequestWorkflows AS Queue
      LEFT JOIN dbo.TEmployee AS Approver
          ON Approver.EmployeeId = Queue.ManagerId
      LEFT JOIN dbo.TEmployeeInfo AS ApproverInfo
          ON ApproverInfo.EmployeeId = Queue.ManagerId
      WHERE Queue.RequestTransid = ${parsedChangeRequestId}
          AND Queue.RequestType = ${REQUEST_TYPE}
          AND Queue.ApproveStatus = 'P'
          AND ISNULL(Queue.IsDeleted, 0) = 0
      ORDER BY Queue.ApprovalLevel, Queue.Transid
    `,
    loadApproversByRequest(db, [header.ChangeRequestId]),
  ]);

  return {
    header: mapHeader(header, approvers.get(header.ChangeRequestId) ?? []),
    details: details.map((row) => ({
      changeDetailsId: row.ChangeDetailsId,
      sectionName: row.SectionName,
      fieldName: row.FieldName,
      dbFieldName: row.DBFieldName,
      tableName: row.TableName,
      oldValue: row.TextValueOld ?? row.OldValue,
      newValue: row.TextValueNew ?? row.NewValue,
      isNew: asBool(row.IsNew),
    })),
    pendingApprovers: pending
      .filter((row) => row.ManagerId > 0)
      .map((row) => ({
        employeeId: row.ManagerId,
        name: row.ApproverName?.trim() || `Employee ${row.ManagerId}`,
        employmentNumber: row.EmploymentNumber,
        approvalLevel: row.ApprovalLevel,
      })),
  };
}

async function loadPeople(
  db: HrmsDb,
  employeeIds: number[],
): Promise<Map<number, { name: string; employmentNumber: string | null }>> {
  const unique = [...new Set(employeeIds.filter((id) => Number.isInteger(id) && id > 0))];
  const people = new Map<number, { name: string; employmentNumber: string | null }>();
  for (const employeeId of unique) {
    const rows = await db.$queryRaw<
      Array<{ FullName: string | null; EmploymentNumber: string | null }>
    >`
      SELECT
          LTRIM(RTRIM(CONCAT_WS(' ', Employee.FName, Employee.MiddleName, Employee.LName))) AS FullName,
          EmployeeInfo.EmploymentNumber
      FROM dbo.TEmployee AS Employee
      LEFT JOIN dbo.TEmployeeInfo AS EmployeeInfo
          ON EmployeeInfo.EmployeeId = Employee.EmployeeId
      WHERE Employee.EmployeeId = ${employeeId}
    `;
    const row = rows[0];
    people.set(employeeId, {
      name: row?.FullName?.trim() || `Employee ${employeeId}`,
      employmentNumber: row?.EmploymentNumber ?? null,
    });
  }
  return people;
}

async function resolveActorEmployeeIds(
  db: HrmsDb,
  input: {
    employerId: number;
    roleName: string;
    roleCode: string;
    subjectEmployeeId: number;
    createdBy: number | null;
  },
): Promise<number[]> {
  if (input.roleCode === "I") {
    return input.createdBy ? [input.createdBy] : [input.subjectEmployeeId];
  }
  if (input.roleCode === "F") {
    const rows = await db.$queryRaw<Array<{ FunctionalManager: number | null }>>`
      SELECT EmployeeInfo.FunctionalManager
      FROM dbo.TEmployeeInfo AS EmployeeInfo
      WHERE EmployeeInfo.EmployeeId = ${input.subjectEmployeeId}
    `;
    const managerId = rows[0]?.FunctionalManager;
    return managerId && managerId > 0 ? [managerId] : [];
  }
  if (input.roleCode === "R") {
    const rows = await db.$queryRaw<Array<{ ReportsTo: number | null }>>`
      SELECT Org.ReportsTo
      FROM dbo.TORGChart AS Org
      WHERE Org.EmployeeID = ${input.subjectEmployeeId}
    `;
    const managerId = rows[0]?.ReportsTo;
    return managerId && managerId > 0 ? [managerId] : [];
  }
  if (input.roleCode === "M") {
    const present = await db.$queryRaw<Array<{ Id: number | null }>>`
      SELECT OBJECT_ID('dbo.TEmployeeOrgBusinessHead', 'U') AS Id
    `;
    if (present[0]?.Id == null) {
      return [];
    }
    const rows = await db.$queryRaw<Array<{ EmployeeId: number }>>`
      SELECT Head.EmployeeId
      FROM dbo.TEmployeeInfo AS EmployeeInfo
      INNER JOIN dbo.TEmployeeOrgBusinessHead AS Head
          ON Head.BusinessUnitId = EmployeeInfo.BusinessUnitId
          AND Head.EmployerID = ${input.employerId}
      WHERE EmployeeInfo.EmployeeId = ${input.subjectEmployeeId}
          AND Head.EmployeeId IS NOT NULL
          AND ISNULL(Head.IsActive, 1) = 1
    `;
    return rows.map((row) => row.EmployeeId).filter((id) => id > 0);
  }
  if (input.roleCode !== "U") {
    return [];
  }
  const roles = await db.$queryRaw<Array<{ RoleId: number }>>`
    SELECT TOP (1) RoleGroup.RoleId
    FROM dbo.TRoleManagement AS RoleGroup
    WHERE ISNULL(RoleGroup.IsDelete, 0) = 0
        AND RoleGroup.RoleName = ${input.roleName}
        AND (
            RoleGroup.Employerid = ${input.employerId}
            OR RoleGroup.Employerid = 0
        )
    ORDER BY CASE WHEN RoleGroup.Employerid = ${input.employerId} THEN 0 ELSE 1 END
  `;
  const roleId = roles[0]?.RoleId;
  if (!roleId) {
    return [];
  }
  const members = await db.$queryRaw<Array<{ Employeeid: number }>>`
    SELECT Mapping.Employeeid
    FROM dbo.tRoleEmployeeMapping AS Mapping
    WHERE Mapping.Roleid = ${roleId}
  `;
  return members.map((row) => row.Employeeid).filter((id) => id > 0);
}

export async function listConfiguredApprovers(
  db: HrmsDb,
  employerId: number,
  changeRequestId: number,
): Promise<ConfiguredApproverGroup[]> {
  const tenantId = parseEmployerId(employerId);
  const parsedChangeRequestId = changeRequestIdSchema.parse(changeRequestId);
  const header = await loadHeader(db, tenantId, parsedChangeRequestId);
  if (!header?.WorkflowId) {
    return [];
  }
  const [workflow, pending] = await Promise.all([
    getWorkflow(db, tenantId, header.WorkflowId),
    db.$queryRaw<Array<{ ManagerId: number }>>`
      SELECT Queue.ManagerId
      FROM dbo.TRequestWorkflows AS Queue
      WHERE Queue.RequestTransid = ${parsedChangeRequestId}
          AND Queue.RequestType = ${REQUEST_TYPE}
          AND Queue.WorkflowId = ${header.WorkflowId}
          AND Queue.ApproveStatus = 'P'
          AND ISNULL(Queue.IsDeleted, 0) = 0
    `,
  ]);
  if (!workflow) {
    return [];
  }
  const pendingIds = pending.map((row) => row.ManagerId);
  const actors = new Map<string, { roleName: string; roleCode: string }>();
  for (const level of workflow.tree?.levels ?? []) {
    for (const actor of level.approvers) {
      const key = `${actor.roleCode}:${actor.name}`;
      if (!actors.has(key)) {
        actors.set(key, { roleName: actor.name, roleCode: actor.roleCode });
      }
    }
  }
  const groups: ConfiguredApproverGroup[] = [];
  for (const actor of actors.values()) {
    const employeeIds = await resolveActorEmployeeIds(db, {
      employerId: tenantId,
      roleName: actor.roleName,
      roleCode: actor.roleCode,
      subjectEmployeeId: header.EmployeeId,
      createdBy: header.CreatedBy,
    });
    const people = await loadPeople(db, employeeIds);
    groups.push({
      roleName: actor.roleName,
      roleCode: actor.roleCode,
      people: employeeIds.map((employeeId) => {
        const person = people.get(employeeId);
        return {
          employeeId,
          name: person?.name ?? `Employee ${employeeId}`,
          employmentNumber: person?.employmentNumber ?? null,
          pending: pendingApproverFlag(employeeId, pendingIds),
        };
      }),
    });
  }
  return groups;
}

export async function requirePendingChangeRequest(
  db: HrmsDb,
  employerId: number,
  workflowId: number,
  changeRequestId: number,
  approverEmployeeId: number,
): Promise<HeaderRow & { Comments: string | null }> {
  const tenantId = parseEmployerId(employerId);
  const parsedWorkflowId = workflowIdSchema.parse(workflowId);
  const parsedChangeRequestId = changeRequestIdSchema.parse(changeRequestId);
  employeeIdSchema.parse(approverEmployeeId);
  const rows = await db.$queryRaw<Array<HeaderRow & { Comments: string | null }>>`
    SELECT
        ChangeRequest.ChangeRequestId,
        ChangeRequest.EmployeeId,
        LTRIM(RTRIM(CONCAT_WS(' ', Subject.FName, Subject.MiddleName, Subject.LName))) AS EmployeeName,
        SubjectInfo.EmploymentNumber,
        ChangeRequest.PageName,
        CAST(NULL AS VARCHAR(500)) AS SectionNames,
        ChangeRequest.CreatedBy,
        CAST(NULL AS VARCHAR(200)) AS CreatedByName,
        CAST(NULL AS VARCHAR(20)) AS CreatedByEmploymentNumber,
        ChangeRequest.RequestedDate,
        ChangeRequest.IsApproved,
        ${parsedWorkflowId} AS WorkflowId,
        CAST(NULL AS VARCHAR(200)) AS WorkflowName,
        ChangeRequest.Comments
    FROM dbo.TMyDetailsChangeRequests AS ChangeRequest
    INNER JOIN dbo.TEmployee AS Subject
        ON Subject.EmployeeId = ChangeRequest.EmployeeId
    LEFT JOIN dbo.TEmployeeInfo AS SubjectInfo
        ON SubjectInfo.EmployeeId = ChangeRequest.EmployeeId
    WHERE ChangeRequest.ChangeRequestId = ${parsedChangeRequestId}
        AND ChangeRequest.EmployerId = ${tenantId}
  `;
  const header = rows[0];
  if (!header) {
    throw new Error("Change request was not found for this employer.");
  }
  if (header.IsApproved != null) {
    throw new Error("This change request is already approved or rejected.");
  }
  if (header.Comments != null) {
    throw new Error("This change request already has comments and cannot be updated.");
  }
  const queue = await db.$queryRaw<Array<{ ManagerId: number }>>`
    SELECT Queue.ManagerId
    FROM dbo.TRequestWorkflows AS Queue
    WHERE Queue.RequestTransid = ${parsedChangeRequestId}
        AND Queue.RequestType = ${REQUEST_TYPE}
        AND Queue.WorkflowId = ${parsedWorkflowId}
        AND Queue.ApproveStatus = 'P'
        AND ISNULL(Queue.IsDeleted, 0) = 0
  `;
  if (queue.length === 0) {
    throw new Error("This request has no pending workflow queue.");
  }
  return header;
}
