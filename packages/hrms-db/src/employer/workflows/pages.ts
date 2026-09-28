import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { asBool, splitCsvIds, statusFromRow } from "./helpers";
import type { WorkflowDefinitionStatus } from "./tree";

export type WorkflowPageMapping = {
  workflowId: number;
  workflowName: string;
  isDefault: boolean;
  isEnable: boolean;
  isPartial: boolean;
  status: WorkflowDefinitionStatus;
};

export type WorkflowPageCatalogRow = {
  modulePageId: number;
  modulePageName: string;
  mappedAppPage: string;
  pageDescription: string | null;
  moduleId: number;
  moduleName: string;
  isWorkflowAvailable: boolean;
  isNotificationOnly: boolean;
  hasTemplate: boolean;
  mappings: WorkflowPageMapping[];
};

type PageRow = {
  ModulePageId: number;
  ModulePageName: string;
  MappedAppPage: string;
  PageDescription: string | null;
  ModuleId: number;
  ModuleName: string;
  IsWorkflowAvailable: boolean | number | null;
  IsNotificationOnlyWorkFlow: boolean | number | null;
  HasTemplate: boolean | number | null;
};

type MappingRow = {
  WorkflowId: number;
  WorkflowName: string;
  MappedPages: string | null;
  Isdefault: boolean | number | null;
  isenable: boolean | number | null;
  IsWorkflowPartial: boolean | number | null;
  WorkflowDefinitionTree: string | null;
};

export async function listWorkflowPages(
  db: HrmsDb,
  employerId: number,
): Promise<WorkflowPageCatalogRow[]> {
  const tenantId = parseEmployerId(employerId);
  const [pages, workflows] = await Promise.all([
    db.$queryRaw<PageRow[]>`
      SELECT DISTINCT
          Page.ModulePageId,
          Page.ModulePageName,
          Page.MappedAppPage,
          Page.PageDescription,
          Module.ModuleId,
          Module.ModuleName,
          Page.IsWorkflowAvailable,
          Page.IsNotificationOnlyWorkFlow,
          CASE
              WHEN EXISTS (
                  SELECT 1
                  FROM dbo.TWorkflowManagement AS Template
                  CROSS APPLY STRING_SPLIT(Template.MappedPages, ',') AS SplitPages
                  WHERE Template.Employerid = 0
                      AND ISNULL(Template.IsDelete, 0) = 0
                      AND TRY_CAST(LTRIM(RTRIM(SplitPages.value)) AS INT) = Page.ModulePageId
              ) THEN 1
              ELSE 0
          END AS HasTemplate
      FROM dbo.TModulePages AS Page
      INNER JOIN dbo.THrmsModules AS Module
          ON Module.ModuleId = Page.PageModuleId
      INNER JOIN dbo.TEmployerDetails AS Employer
          ON Employer.Employerid = ${tenantId}
      WHERE Page.IsEnable = 'Y'
          AND ISNULL(Page.IsWorkflowAvailable, 0) = 1
          AND Module.IsActive = 1
          AND EXISTS (
              SELECT 1
              FROM dbo.TEmployerModule AS EmployerModule
              WHERE EmployerModule.HrmsModuleID = Module.ModuleId
                  AND EmployerModule.IsActive = 1
                  AND EmployerModule.EmployerId = ISNULL(Employer.RootEmployerId, ${tenantId})
          )
      ORDER BY Module.ModuleName, Page.ModulePageName
    `,
    db.$queryRaw<MappingRow[]>`
      SELECT
          Workflow.WorkflowId,
          Workflow.WorkflowName,
          Workflow.MappedPages,
          Workflow.Isdefault,
          Workflow.isenable,
          Workflow.IsWorkflowPartial,
          Workflow.WorkflowDefinitionTree
      FROM dbo.TWorkflowManagement AS Workflow
      WHERE Workflow.Employerid = ${tenantId}
          AND ISNULL(Workflow.IsDelete, 0) = 0
    `,
  ]);

  const uniquePages = new Map<number, WorkflowPageCatalogRow>();
  for (const page of pages) {
    if (uniquePages.has(page.ModulePageId)) {
      continue;
    }
    const mappings = new Map<number, WorkflowPageMapping>();
    for (const workflow of workflows) {
      if (!splitCsvIds(workflow.MappedPages).includes(page.ModulePageId)) {
        continue;
      }
      mappings.set(workflow.WorkflowId, {
        workflowId: workflow.WorkflowId,
        workflowName: workflow.WorkflowName,
        isDefault: asBool(workflow.Isdefault),
        isEnable: asBool(workflow.isenable),
        isPartial: asBool(workflow.IsWorkflowPartial),
        status: statusFromRow({
          treeXml: workflow.WorkflowDefinitionTree,
          isPartial: workflow.IsWorkflowPartial,
        }),
      });
    }
    uniquePages.set(page.ModulePageId, {
      modulePageId: page.ModulePageId,
      modulePageName: page.ModulePageName,
      mappedAppPage: page.MappedAppPage,
      pageDescription: page.PageDescription,
      moduleId: page.ModuleId,
      moduleName: page.ModuleName,
      isWorkflowAvailable: asBool(page.IsWorkflowAvailable),
      isNotificationOnly: asBool(page.IsNotificationOnlyWorkFlow),
      hasTemplate: asBool(page.HasTemplate),
      mappings: [...mappings.values()],
    });
  }
  return [...uniquePages.values()];
}

export async function listMappablePages(
  db: HrmsDb,
  employerId: number,
): Promise<
  Array<{
    modulePageId: number;
    modulePageName: string;
    moduleId: number;
    moduleName: string;
    isNotificationOnly: boolean;
  }>
> {
  const pages = await listWorkflowPages(db, employerId);
  return pages.map((page) => ({
    modulePageId: page.modulePageId,
    modulePageName: page.modulePageName,
    moduleId: page.moduleId,
    moduleName: page.moduleName,
    isNotificationOnly: page.isNotificationOnly,
  }));
}
