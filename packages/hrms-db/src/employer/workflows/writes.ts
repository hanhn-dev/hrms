import type { HrmsDb } from "../../shared/client";

type Tx = Parameters<Parameters<HrmsDb["$transaction"]>[0]>[0];
import {
  moduleIdSchema,
  parseEmployerId,
  workflowIdSchema,
} from "../../shared/ids";
import { asBool, joinCsvIds, mappedPagesOverlap, splitCsvIds } from "./helpers";
import { getWorkflow } from "./get";
import {
  encodeWorkflowDefinitionTree,
  flattenWorkflowDetails,
  isWorkflowPartial,
  type WorkflowTree,
} from "./tree";

export type WorkflowHeaderInput = {
  employerId: number;
  workflowId?: number;
  workflowName: string;
  workflowDescription: string | null;
  routingLevels: number;
  mappedPageIds: number[];
  moduleId: number;
  isDefault: boolean;
  isEnable: boolean;
  skipWorkFlow: boolean;
  isEnableAutoApproved: boolean;
  isLocationMapped: boolean;
  isBuMapped: boolean;
  isAllBuSelected: boolean;
  isAllLocationSelected: boolean;
  locationIds: number[];
  businessUnitIds: number[];
};

export type WorkflowCollision = {
  workflowId: number;
  workflowName: string;
  mappedPages: string | null;
  isUnscoped: boolean;
};

type ExistingHeader = {
  WorkflowId: number;
  WorkflowName: string;
  MappedPages: string | null;
  IsAllBUSelected: boolean | number | null;
  IsAllLocationSelected: boolean | number | null;
  LocationCount: number;
  BusinessUnitCount: number;
};

function parseHeader(input: WorkflowHeaderInput): WorkflowHeaderInput {
  const name = input.workflowName.trim();
  if (name.length === 0 || name.length > 100) {
    throw new Error("Workflow name is required and must be at most 100 characters.");
  }
  const description = input.workflowDescription?.trim() || null;
  if (description && description.length > 200) {
    throw new Error("Workflow description must be at most 200 characters.");
  }
  const routingLevels = input.routingLevels;
  if (!Number.isInteger(routingLevels) || routingLevels < 1 || routingLevels > 20) {
    throw new Error("Routing levels must be an integer between 1 and 20.");
  }
  if (input.mappedPageIds.length === 0) {
    throw new Error("Map at least one page.");
  }
  return {
    ...input,
    employerId: parseEmployerId(input.employerId),
    workflowId: input.workflowId ? workflowIdSchema.parse(input.workflowId) : undefined,
    workflowName: name,
    workflowDescription: description,
    moduleId: moduleIdSchema.parse(input.moduleId),
    mappedPageIds: [...new Set(input.mappedPageIds)],
    locationIds: [...new Set(input.locationIds)],
    businessUnitIds: [...new Set(input.businessUnitIds)],
  };
}

function isUnscoped(input: {
  isAllBuSelected: boolean;
  isAllLocationSelected: boolean;
  locationIds: number[];
  businessUnitIds: number[];
}): boolean {
  return (
    (input.locationIds.length === 0 && input.businessUnitIds.length === 0) ||
    (input.isAllBuSelected && input.isAllLocationSelected)
  );
}

export async function listWorkflowCollisions(
  db: HrmsDb,
  input: WorkflowHeaderInput,
): Promise<WorkflowCollision[]> {
  const header = parseHeader(input);
  const rows = await db.$queryRaw<ExistingHeader[]>`
    SELECT
        Workflow.WorkflowId,
        Workflow.WorkflowName,
        Workflow.MappedPages,
        Workflow.IsAllBUSelected,
        Workflow.IsAllLocationSelected,
        (
            SELECT COUNT(*)
            FROM dbo.TWorkFlowLocations AS Mapping
            WHERE Mapping.WorkFlowID = Workflow.WorkflowId
        ) AS LocationCount,
        (
            SELECT COUNT(*)
            FROM dbo.TWorkFlowBusinessUnits AS Mapping
            WHERE Mapping.WorkFlowID = Workflow.WorkflowId
        ) AS BusinessUnitCount
    FROM dbo.TWorkflowManagement AS Workflow
    WHERE Workflow.Employerid = ${header.employerId}
        AND ISNULL(Workflow.IsDelete, 0) = 0
        AND ISNULL(Workflow.isenable, 0) = 1
        AND Workflow.WorkflowId <> ${header.workflowId ?? 0}
  `;
  const incomingUnscoped = isUnscoped(header);
  const mappedPages = joinCsvIds(header.mappedPageIds);
  return rows
    .filter((row) => mappedPagesOverlap(mappedPages, row.MappedPages))
    .map((row) => {
      const existingUnscoped =
        (Number(row.LocationCount) === 0 && Number(row.BusinessUnitCount) === 0) ||
        (asBool(row.IsAllBUSelected) && asBool(row.IsAllLocationSelected));
      return {
        workflowId: row.WorkflowId,
        workflowName: row.WorkflowName,
        mappedPages: row.MappedPages,
        isUnscoped: existingUnscoped && incomingUnscoped,
      };
    })
    .filter((row) => row.isUnscoped);
}

async function assertNoCollision(db: HrmsDb, input: WorkflowHeaderInput): Promise<void> {
  const collisions = await listWorkflowCollisions(db, input);
  if (collisions.length > 0) {
    const names = collisions.map((row) => row.workflowName).join(", ");
    throw new Error(
      `Another enabled workflow already maps the same page(s) without BU/location scope: ${names}.`,
    );
  }
}

async function resolveNotificationOnly(
  db: HrmsDb,
  mappedPageIds: number[],
): Promise<boolean> {
  if (mappedPageIds.length === 0) {
    return false;
  }
  const csv = joinCsvIds(mappedPageIds);
  const rows = await db.$queryRaw<
    Array<{ IsNotificationOnlyWorkFlow: boolean | number | null }>
  >`
    SELECT Page.IsNotificationOnlyWorkFlow
    FROM STRING_SPLIT(${csv}, ',') AS SplitPages
    INNER JOIN dbo.TModulePages AS Page
        ON Page.ModulePageId = TRY_CAST(LTRIM(RTRIM(SplitPages.value)) AS INT)
  `;
  return rows.length > 0 && rows.every((row) => asBool(row.IsNotificationOnlyWorkFlow));
}

async function replaceScope(
  tx: Tx,
  workflowId: number,
  locationIds: number[],
  businessUnitIds: number[],
): Promise<void> {
  await tx.$executeRaw`
    DELETE FROM dbo.TWorkFlowLocations WHERE WorkFlowID = ${workflowId}
  `;
  await tx.$executeRaw`
    DELETE FROM dbo.TWorkFlowBusinessUnits WHERE WorkFlowID = ${workflowId}
  `;
  for (const locationId of locationIds) {
    await tx.$executeRaw`
      INSERT INTO dbo.TWorkFlowLocations (WorkFlowID, LocationID)
      VALUES (${workflowId}, ${locationId})
    `;
  }
  for (const businessUnitId of businessUnitIds) {
    await tx.$executeRaw`
      INSERT INTO dbo.TWorkFlowBusinessUnits (WorkFlowID, BusinessUnitID)
      VALUES (${workflowId}, ${businessUnitId})
    `;
  }
  await tx.$executeRaw`
    INSERT INTO dbo.TWorkFlowLocationsHistory (WorkFlowLocationID, WorkFlowID, LocationID)
    SELECT Mapping.WorkFlowLocationID, Mapping.WorkFlowID, Mapping.LocationID
    FROM dbo.TWorkFlowLocations AS Mapping
    WHERE Mapping.WorkFlowID = ${workflowId}
  `;
  await tx.$executeRaw`
    INSERT INTO dbo.TWorkFlowBusinessUnitsHistory (WorkFlowBusinessUnitID, WorkFlowID, LocationID)
    SELECT Mapping.WorkFlowBusinessUnitID, Mapping.WorkFlowID, Mapping.BusinessUnitID
    FROM dbo.TWorkFlowBusinessUnits AS Mapping
    WHERE Mapping.WorkFlowID = ${workflowId}
  `;
}

async function snapshotHeader(
  tx: Tx,
  workflowId: number,
  employerId: number,
  updatedBy: number,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO dbo.TWorkflowManagement_History (
        WorkflowId, WorkflowName, WorkflowDescription, RoutingLevels,
        MappedPages, WorkflowDefinitionTree, CreatedBy, CreatedDate,
        UpdatedBy, UpdatedDate, IsDelete, Isdefault, isenable, Employerid,
        SkipWorkFlow, IsWorkflowPartial, ModuleId, IsEnableAutoApproved,
        HistoryCreatedBy, HistoryCreatedDate, Action,
        IsLocationMapped, IsBUMapped, IsAllBUSelected, IsAllLocationSelected
    )
    SELECT
        Workflow.WorkflowId, Workflow.WorkflowName, Workflow.WorkflowDescription,
        Workflow.RoutingLevels, Workflow.MappedPages, Workflow.WorkflowDefinitionTree,
        Workflow.CreatedBy, Workflow.CreatedDate, Workflow.UpdatedBy, Workflow.UpdatedDate,
        Workflow.IsDelete, Workflow.Isdefault, Workflow.isenable, Workflow.Employerid,
        Workflow.SkipWorkFlow, Workflow.IsWorkflowPartial, Workflow.ModuleId,
        Workflow.IsEnableAutoApproved, ${updatedBy}, GETDATE(), 'Record Updated',
        Workflow.IsLocationMapped, Workflow.IsBUMapped, Workflow.IsAllBUSelected,
        Workflow.IsAllLocationSelected
    FROM dbo.TWorkflowManagement AS Workflow
    WHERE Workflow.WorkflowId = ${workflowId}
        AND Workflow.Employerid = ${employerId}
        AND ISNULL(Workflow.IsDelete, 0) = 0
  `;
}

export async function createWorkflowHeader(
  db: HrmsDb,
  input: WorkflowHeaderInput & { createdBy: number },
): Promise<number> {
  const header = parseHeader(input);
  const createdBy = input.createdBy;
  await assertNoCollision(db, header);
  const mappedPages = joinCsvIds(header.mappedPageIds);
  const notificationOnly = await resolveNotificationOnly(db, header.mappedPageIds);

  return db.$transaction(async (tx) => {
    const inserted = await tx.$queryRaw<Array<{ WorkflowId: number }>>`
      INSERT INTO dbo.TWorkflowManagement (
          WorkflowName, WorkflowDescription, RoutingLevels, MappedPages,
          WorkflowDefinitionTree, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate,
          IsDelete, Isdefault, isenable, Employerid, SkipWorkFlow, IsWorkflowPartial,
          ModuleId, IsEnableAutoApproved, IsLocationMapped, IsBUMapped,
          IsAllBUSelected, IsAllLocationSelected, IsNotificationOnlyWorkFlow
      )
      OUTPUT INSERTED.WorkflowId
      VALUES (
          ${header.workflowName},
          ${header.workflowDescription},
          ${header.routingLevels},
          ${mappedPages},
          NULL,
          ${createdBy},
          GETDATE(),
          ${createdBy},
          GETDATE(),
          0,
          ${header.isDefault ? 1 : 0},
          ${header.isEnable ? 1 : 0},
          ${header.employerId},
          ${header.skipWorkFlow ? 1 : 0},
          0,
          ${header.moduleId},
          ${header.isEnableAutoApproved ? 1 : 0},
          ${header.isLocationMapped ? 1 : 0},
          ${header.isBuMapped ? 1 : 0},
          ${header.isAllBuSelected ? 1 : 0},
          ${header.isAllLocationSelected ? 1 : 0},
          ${notificationOnly ? 1 : 0}
      )
    `;
    const workflowId = inserted[0]?.WorkflowId;
    if (!workflowId) {
      throw new Error("Workflow header insert did not return an id.");
    }
    await replaceScope(tx, workflowId, header.locationIds, header.businessUnitIds);
    return workflowId;
  });
}

export async function updateWorkflowHeader(
  db: HrmsDb,
  input: WorkflowHeaderInput & { updatedBy: number },
): Promise<void> {
  const header = parseHeader(input);
  const workflowId = workflowIdSchema.parse(header.workflowId);
  await assertNoCollision(db, { ...header, workflowId });
  const mappedPages = joinCsvIds(header.mappedPageIds);
  const notificationOnly = await resolveNotificationOnly(db, header.mappedPageIds);

  await db.$transaction(async (tx) => {
    const existing = await tx.$queryRaw<Array<{ WorkflowId: number }>>`
      SELECT Workflow.WorkflowId
      FROM dbo.TWorkflowManagement AS Workflow
      WHERE Workflow.WorkflowId = ${workflowId}
          AND Workflow.Employerid = ${header.employerId}
          AND ISNULL(Workflow.IsDelete, 0) = 0
    `;
    if (existing.length === 0) {
      throw new Error("Workflow was not found for this employer.");
    }
    await snapshotHeader(tx, workflowId, header.employerId, input.updatedBy);
    await tx.$executeRaw`
      UPDATE Workflow
      SET
          Workflow.WorkflowName = ${header.workflowName},
          Workflow.WorkflowDescription = ${header.workflowDescription},
          Workflow.RoutingLevels = ${header.routingLevels},
          Workflow.MappedPages = ${mappedPages},
          Workflow.UpdatedBy = ${input.updatedBy},
          Workflow.UpdatedDate = GETDATE(),
          Workflow.Isdefault = ${header.isDefault ? 1 : 0},
          Workflow.isenable = ${header.isEnable ? 1 : 0},
          Workflow.SkipWorkFlow = ${header.skipWorkFlow ? 1 : 0},
          Workflow.ModuleId = ${header.moduleId},
          Workflow.IsEnableAutoApproved = ${header.isEnableAutoApproved ? 1 : 0},
          Workflow.IsLocationMapped = ${header.isLocationMapped ? 1 : 0},
          Workflow.IsBUMapped = ${header.isBuMapped ? 1 : 0},
          Workflow.IsAllBUSelected = ${header.isAllBuSelected ? 1 : 0},
          Workflow.IsAllLocationSelected = ${header.isAllLocationSelected ? 1 : 0},
          Workflow.IsNotificationOnlyWorkFlow = ${notificationOnly ? 1 : 0}
      FROM dbo.TWorkflowManagement AS Workflow
      WHERE Workflow.WorkflowId = ${workflowId}
          AND Workflow.Employerid = ${header.employerId}
          AND ISNULL(Workflow.IsDelete, 0) = 0
    `;
    await replaceScope(tx, workflowId, header.locationIds, header.businessUnitIds);
  });
}

export async function lookupWorkflowRoleIds(
  db: HrmsDb,
  employerId: number,
  names: string[],
): Promise<Map<string, number>> {
  const tenantId = parseEmployerId(employerId);
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const resolved = new Map<string, number>();
  for (const name of unique) {
    const rows = await db.$queryRaw<Array<{ RoleId: number }>>`
      SELECT TOP (1) RoleGroup.RoleId
      FROM dbo.TRoleManagement AS RoleGroup
      WHERE ISNULL(RoleGroup.IsDelete, 0) = 0
          AND RoleGroup.RoleName = ${name}
          AND (
              RoleGroup.Employerid = ${tenantId}
              OR RoleGroup.Employerid = 0
          )
      ORDER BY CASE WHEN RoleGroup.Employerid = ${tenantId} THEN 0 ELSE 1 END
    `;
    if (rows[0]) {
      resolved.set(name, rows[0].RoleId);
    }
  }
  return resolved;
}

export async function updateWorkflowTree(
  db: HrmsDb,
  input: {
    employerId: number;
    workflowId: number;
    tree: WorkflowTree;
    updatedBy: number;
  },
): Promise<void> {
  const employerId = parseEmployerId(input.employerId);
  const workflowId = workflowIdSchema.parse(input.workflowId);
  const current = await getWorkflow(db, employerId, workflowId);
  if (!current) {
    throw new Error("Workflow was not found for this employer.");
  }
  const tree: WorkflowTree = {
    ...input.tree,
    rootText: input.tree.rootText.trim() || current.workflowName,
  };
  const roleNames = tree.levels.flatMap((level) => [
    ...level.approvers.map((actor) => actor.name),
    ...level.notifications.map((actor) => actor.name),
  ]);
  const roleIds = await lookupWorkflowRoleIds(db, employerId, roleNames);
  const details = flattenWorkflowDetails(tree, roleIds);
  const xml = encodeWorkflowDefinitionTree(tree);
  const partial = isWorkflowPartial(tree, current.isNotificationOnly);
  const routingLevels = Math.max(tree.levels.length, 1);

  await db.$transaction(async (tx) => {
    await snapshotHeader(tx, workflowId, employerId, input.updatedBy);
    await tx.$executeRaw`
      UPDATE Workflow
      SET
          Workflow.WorkflowDefinitionTree = ${xml},
          Workflow.RoutingLevels = ${routingLevels},
          Workflow.IsWorkflowPartial = ${partial ? 1 : 0},
          Workflow.UpdatedBy = ${input.updatedBy},
          Workflow.UpdatedDate = GETDATE()
      FROM dbo.TWorkflowManagement AS Workflow
      WHERE Workflow.WorkflowId = ${workflowId}
          AND Workflow.Employerid = ${employerId}
          AND ISNULL(Workflow.IsDelete, 0) = 0
    `;
    await tx.$executeRaw`
      DELETE FROM dbo.TWorkflowDetails WHERE WorkflowId = ${workflowId}
    `;
    for (const detail of details) {
      await tx.$executeRaw`
        INSERT INTO dbo.TWorkflowDetails (
            WorkflowId, ManagerId, WorkflowRole, WorkflowName, RoutingLevels,
            LevelNotifications, ApproversNotifications, RejectionNotifications,
            PullbackNotifications, CreatedBy, CreatedDate, UpdatedBy, UpdatedDate,
            IsDelete
        )
        VALUES (
            ${workflowId},
            ${detail.managerId},
            ${detail.workflowRole},
            ${current.workflowName},
            ${detail.routingLevel},
            ${detail.levelNotifications},
            ${detail.approversNotifications},
            ${detail.rejectionNotifications},
            ${detail.pullbackNotifications},
            ${input.updatedBy},
            GETDATE(),
            ${input.updatedBy},
            NULL,
            0
        )
      `;
    }
  });
}

export async function getWorkflowWritePreview(
  db: HrmsDb,
  employerId: number,
  workflowId: number | null,
): Promise<Array<Record<string, unknown>>> {
  if (!workflowId) {
    return [{ WorkflowId: null, WorkflowName: null, Status: "create" }];
  }
  const workflow = await getWorkflow(db, employerId, workflowId);
  if (!workflow) {
    return [];
  }
  return [
    {
      WorkflowId: workflow.workflowId,
      WorkflowName: workflow.workflowName,
      MappedPages: workflow.mappedPageNames.join(", "),
      RoutingLevels: workflow.routingLevels,
      Status: workflow.status,
      DetailRows: workflow.details.length,
      IsPartial: workflow.isPartial,
      IsEnable: workflow.isEnable,
    },
  ];
}
