import type { HrmsDb } from "../../shared/client";
import { parseEmployerId, workflowIdSchema } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import { asBool, splitCsvIds, statusFromRow } from "./helpers";
import {
  parseWorkflowDefinitionTree,
  type WorkflowDefinitionStatus,
  type WorkflowTree,
} from "./tree";

export type WorkflowDetailRow = {
  workflowDetailId: number;
  managerId: number;
  workflowRole: string | null;
  routingLevel: number;
  levelNotifications: string | null;
  approversNotifications: string | null;
  rejectionNotifications: string | null;
  pullbackNotifications: string | null;
};

export type WorkflowDefinition = {
  workflowId: number;
  workflowName: string;
  workflowDescription: string | null;
  routingLevels: number;
  mappedPageIds: number[];
  mappedPageNames: string[];
  moduleId: number | null;
  moduleName: string | null;
  isDefault: boolean;
  isEnable: boolean;
  skipWorkFlow: boolean;
  isPartial: boolean;
  isEnableAutoApproved: boolean;
  isLocationMapped: boolean;
  isBuMapped: boolean;
  isAllBuSelected: boolean;
  isAllLocationSelected: boolean;
  isNotificationOnly: boolean;
  locationIds: number[];
  businessUnitIds: number[];
  treeXml: string | null;
  tree: WorkflowTree | null;
  details: WorkflowDetailRow[];
  status: WorkflowDefinitionStatus;
  createdDate: string | null;
  updatedDate: string | null;
};

type HeaderRow = {
  WorkflowId: number;
  WorkflowName: string;
  WorkflowDescription: string | null;
  RoutingLevels: number;
  MappedPages: string | null;
  ModuleId: number | null;
  ModuleName: string | null;
  Isdefault: boolean | number | null;
  isenable: boolean | number | null;
  SkipWorkFlow: boolean | number | null;
  IsWorkflowPartial: boolean | number | null;
  IsEnableAutoApproved: boolean | number | null;
  IsLocationMapped: boolean | number | null;
  IsBUMapped: boolean | number | null;
  IsAllBUSelected: boolean | number | null;
  IsAllLocationSelected: boolean | number | null;
  IsNotificationOnlyWorkFlow: boolean | number | null;
  WorkflowDefinitionTree: string | null;
  CreatedDate: Date | string | null;
  UpdatedDate: Date | string | null;
};

export async function getWorkflow(
  db: HrmsDb,
  employerId: number,
  workflowId: number,
): Promise<WorkflowDefinition | null> {
  const tenantId = parseEmployerId(employerId);
  const parsedWorkflowId = workflowIdSchema.parse(workflowId);
  const headers = await db.$queryRaw<HeaderRow[]>`
    SELECT
        Workflow.WorkflowId,
        Workflow.WorkflowName,
        Workflow.WorkflowDescription,
        Workflow.RoutingLevels,
        Workflow.MappedPages,
        Workflow.ModuleId,
        Module.ModuleName,
        Workflow.Isdefault,
        Workflow.isenable,
        Workflow.SkipWorkFlow,
        Workflow.IsWorkflowPartial,
        Workflow.IsEnableAutoApproved,
        Workflow.IsLocationMapped,
        Workflow.IsBUMapped,
        Workflow.IsAllBUSelected,
        Workflow.IsAllLocationSelected,
        Workflow.IsNotificationOnlyWorkFlow,
        Workflow.WorkflowDefinitionTree,
        Workflow.CreatedDate,
        Workflow.UpdatedDate
    FROM dbo.TWorkflowManagement AS Workflow
    LEFT JOIN dbo.THrmsModules AS Module
        ON Module.ModuleId = Workflow.ModuleId
    WHERE Workflow.WorkflowId = ${parsedWorkflowId}
        AND Workflow.Employerid = ${tenantId}
        AND ISNULL(Workflow.IsDelete, 0) = 0
  `;
  const header = headers[0];
  if (!header) {
    return null;
  }

  const mappedPageIds = splitCsvIds(header.MappedPages);
  const mappedPagesCsv = header.MappedPages ?? "";
  const [pages, locations, businessUnits, details] = await Promise.all([
    mappedPageIds.length === 0
      ? Promise.resolve([])
      : db.$queryRaw<Array<{ ModulePageId: number; ModulePageName: string }>>`
          SELECT Page.ModulePageId, Page.ModulePageName
          FROM STRING_SPLIT(${mappedPagesCsv}, ',') AS SplitPages
          INNER JOIN dbo.TModulePages AS Page
              ON Page.ModulePageId = TRY_CAST(LTRIM(RTRIM(SplitPages.value)) AS INT)
          ORDER BY Page.ModulePageName
        `,
    db.$queryRaw<Array<{ LocationID: number }>>`
      SELECT Mapping.LocationID
      FROM dbo.TWorkFlowLocations AS Mapping
      WHERE Mapping.WorkFlowID = ${parsedWorkflowId}
    `,
    db.$queryRaw<Array<{ BusinessUnitID: number }>>`
      SELECT Mapping.BusinessUnitID
      FROM dbo.TWorkFlowBusinessUnits AS Mapping
      WHERE Mapping.WorkFlowID = ${parsedWorkflowId}
    `,
    db.$queryRaw<
      Array<{
        WorkflowDetailId: number;
        ManagerId: number;
        WorkflowRole: string | null;
        RoutingLevels: number;
        LevelNotifications: string | null;
        ApproversNotifications: string | null;
        RejectionNotifications: string | null;
        PullbackNotifications: string | null;
      }>
    >`
      SELECT
          Detail.WorkflowDetailId,
          Detail.ManagerId,
          Detail.WorkflowRole,
          Detail.RoutingLevels,
          Detail.LevelNotifications,
          Detail.ApproversNotifications,
          Detail.RejectionNotifications,
          Detail.PullbackNotifications
      FROM dbo.TWorkflowDetails AS Detail
      WHERE Detail.WorkflowId = ${parsedWorkflowId}
          AND ISNULL(Detail.IsDelete, 0) = 0
      ORDER BY Detail.RoutingLevels, Detail.WorkflowDetailId
    `,
  ]);

  const tree = parseWorkflowDefinitionTree(header.WorkflowDefinitionTree);
  return {
    workflowId: header.WorkflowId,
    workflowName: header.WorkflowName,
    workflowDescription: header.WorkflowDescription,
    routingLevels: header.RoutingLevels,
    mappedPageIds,
    mappedPageNames: pages.map((page) => page.ModulePageName),
    moduleId: header.ModuleId,
    moduleName: header.ModuleName,
    isDefault: asBool(header.Isdefault),
    isEnable: asBool(header.isenable),
    skipWorkFlow: asBool(header.SkipWorkFlow),
    isPartial: asBool(header.IsWorkflowPartial),
    isEnableAutoApproved: asBool(header.IsEnableAutoApproved),
    isLocationMapped: asBool(header.IsLocationMapped),
    isBuMapped: asBool(header.IsBUMapped),
    isAllBuSelected: asBool(header.IsAllBUSelected),
    isAllLocationSelected: asBool(header.IsAllLocationSelected),
    isNotificationOnly: asBool(header.IsNotificationOnlyWorkFlow),
    locationIds: locations.map((row) => row.LocationID),
    businessUnitIds: businessUnits.map((row) => row.BusinessUnitID),
    treeXml: header.WorkflowDefinitionTree,
    tree,
    details: details.map((row) => ({
      workflowDetailId: row.WorkflowDetailId,
      managerId: row.ManagerId,
      workflowRole: row.WorkflowRole,
      routingLevel: row.RoutingLevels,
      levelNotifications: row.LevelNotifications,
      approversNotifications: row.ApproversNotifications,
      rejectionNotifications: row.RejectionNotifications,
      pullbackNotifications: row.PullbackNotifications,
    })),
    status: statusFromRow({
      treeXml: header.WorkflowDefinitionTree,
      isPartial: header.IsWorkflowPartial,
    }),
    createdDate: asIso(header.CreatedDate),
    updatedDate: asIso(header.UpdatedDate),
  };
}
