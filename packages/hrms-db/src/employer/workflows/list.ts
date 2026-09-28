import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { asIso } from "../../shared/iso";
import { asBool, statusFromRow } from "./helpers";
import type { WorkflowDefinitionStatus } from "./tree";

export type WorkflowListItem = {
  workflowId: number;
  workflowName: string;
  workflowDescription: string | null;
  routingLevels: number;
  mappedPages: string | null;
  mappedPageNames: string | null;
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
  locationNames: string | null;
  businessUnitNames: string | null;
  status: WorkflowDefinitionStatus;
  createdDate: string | null;
  updatedDate: string | null;
};

export type WorkflowSettings = {
  allowPartialWorkflow: boolean;
};

type ListRow = {
  WorkflowId: number;
  WorkflowName: string;
  WorkflowDescription: string | null;
  RoutingLevels: number;
  MappedPages: string | null;
  MappedPageNames: string | null;
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
  LocationNames: string | null;
  BusinessUnitNames: string | null;
  WorkflowDefinitionTree: string | null;
  CreatedDate: Date | string | null;
  UpdatedDate: Date | string | null;
};

export async function listWorkflows(
  db: HrmsDb,
  employerId: number,
): Promise<WorkflowListItem[]> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<ListRow[]>`
    SELECT
        Workflow.WorkflowId,
        Workflow.WorkflowName,
        Workflow.WorkflowDescription,
        Workflow.RoutingLevels,
        Workflow.MappedPages,
        (
            SELECT STRING_AGG(Page.ModulePageName, ', ')
                WITHIN GROUP (ORDER BY Page.ModulePageName)
            FROM STRING_SPLIT(Workflow.MappedPages, ',') AS SplitPages
            INNER JOIN dbo.TModulePages AS Page
                ON Page.ModulePageId = TRY_CAST(LTRIM(RTRIM(SplitPages.value)) AS INT)
        ) AS MappedPageNames,
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
        (
            SELECT STRING_AGG(Location.LocationName, ', ')
                WITHIN GROUP (ORDER BY Location.LocationName)
            FROM dbo.TWorkFlowLocations AS Mapping
            INNER JOIN dbo.TLocation AS Location
                ON Location.LocationID = Mapping.LocationID
            WHERE Mapping.WorkFlowID = Workflow.WorkflowId
        ) AS LocationNames,
        (
            SELECT STRING_AGG(BusinessUnit.UnitName, ', ')
                WITHIN GROUP (ORDER BY BusinessUnit.UnitName)
            FROM dbo.TWorkFlowBusinessUnits AS Mapping
            INNER JOIN dbo.TOrgHierarchyDetails AS BusinessUnit
                ON BusinessUnit.UnitID = Mapping.BusinessUnitID
            WHERE Mapping.WorkFlowID = Workflow.WorkflowId
        ) AS BusinessUnitNames,
        Workflow.WorkflowDefinitionTree,
        Workflow.CreatedDate,
        Workflow.UpdatedDate
    FROM dbo.TWorkflowManagement AS Workflow
    LEFT JOIN dbo.THrmsModules AS Module
        ON Module.ModuleId = Workflow.ModuleId
    WHERE Workflow.Employerid = ${tenantId}
        AND ISNULL(Workflow.IsDelete, 0) = 0
    ORDER BY Workflow.WorkflowName
  `;
  const unique = new Map<number, WorkflowListItem>();
  for (const row of rows) {
    if (unique.has(row.WorkflowId)) {
      continue;
    }
    unique.set(row.WorkflowId, {
      workflowId: row.WorkflowId,
      workflowName: row.WorkflowName,
      workflowDescription: row.WorkflowDescription,
      routingLevels: row.RoutingLevels,
      mappedPages: row.MappedPages,
      mappedPageNames: row.MappedPageNames,
      moduleId: row.ModuleId,
      moduleName: row.ModuleName,
      isDefault: asBool(row.Isdefault),
      isEnable: asBool(row.isenable),
      skipWorkFlow: asBool(row.SkipWorkFlow),
      isPartial: asBool(row.IsWorkflowPartial),
      isEnableAutoApproved: asBool(row.IsEnableAutoApproved),
      isLocationMapped: asBool(row.IsLocationMapped),
      isBuMapped: asBool(row.IsBUMapped),
      isAllBuSelected: asBool(row.IsAllBUSelected),
      isAllLocationSelected: asBool(row.IsAllLocationSelected),
      isNotificationOnly: asBool(row.IsNotificationOnlyWorkFlow),
      locationNames: row.LocationNames,
      businessUnitNames: row.BusinessUnitNames,
      status: statusFromRow({
        treeXml: row.WorkflowDefinitionTree,
        isPartial: row.IsWorkflowPartial,
      }),
      createdDate: asIso(row.CreatedDate),
      updatedDate: asIso(row.UpdatedDate),
    });
  }
  return [...unique.values()];
}

export async function getWorkflowSettings(
  db: HrmsDb,
  employerId: number,
): Promise<WorkflowSettings> {
  const tenantId = parseEmployerId(employerId);
  const rows = await db.$queryRaw<
    Array<{ AllowPartialWorkflow: boolean | number | null }>
  >`
    SELECT Settings.AllowPartialWorkflow
    FROM dbo.TCustomerSettings AS Settings
    WHERE Settings.EmployerId = ${tenantId}
  `;
  return {
    allowPartialWorkflow: asBool(rows[0]?.AllowPartialWorkflow),
  };
}
