import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import {
  likeContains,
  LIST_PAGE_SIZE,
  pageQuery,
  searchText,
  totalCountOf,
  type PageResult,
} from "../../shared/page.ts";
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
  TotalCount?: number | bigint | null;
};

export type WorkflowPageCatalogPage = PageResult<WorkflowPageCatalogRow>;

const modulePageSelect = Prisma.sql`
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
`;

function modulePageFrom(tenantId: number, search: Prisma.Sql, name: string | null): Prisma.Sql {
  const nameFilter =
    name == null
      ? Prisma.empty
      : Prisma.sql`AND LOWER(Page.ModulePageName) = LOWER(${name})`;
  return Prisma.sql`
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
        ${nameFilter}
        ${search}
  `;
}

function pageSearch(q: string | null): Prisma.Sql {
  if (q == null) {
    return Prisma.empty;
  }
  const pattern = likeContains(q);
  return Prisma.sql`AND (
        Page.ModulePageName LIKE ${pattern}
        OR Page.MappedAppPage LIKE ${pattern}
        OR Page.PageDescription LIKE ${pattern}
        OR Module.ModuleName LIKE ${pattern}
    )`;
}

async function selectModulePages(
  db: HrmsDb,
  tenantId: number,
  filters: { page?: number | null; q?: string | null; name?: string | null } | null,
): Promise<{ rows: PageRow[]; totalCount: number; page: number; pageSize: number }> {
  const search = pageSearch(searchText(filters?.q));
  const name = filters?.name?.trim() ? filters.name.trim() : null;
  const from = modulePageFrom(tenantId, search, name);
  if (filters == null) {
    const rows = await db.$queryRaw<PageRow[]>`
      SELECT DISTINCT
          ${modulePageSelect}
      ${from}
      ORDER BY Module.ModuleName, Page.ModulePageName, Page.ModulePageId
    `;
    return {
      rows,
      totalCount: rows.length,
      page: 1,
      pageSize: rows.length || LIST_PAGE_SIZE,
    };
  }
  const paging = pageQuery(filters.page);
  const rows = await db.$queryRaw<PageRow[]>`
    SELECT
        Pages.ModulePageId,
        Pages.ModulePageName,
        Pages.MappedAppPage,
        Pages.PageDescription,
        Pages.ModuleId,
        Pages.ModuleName,
        Pages.IsWorkflowAvailable,
        Pages.IsNotificationOnlyWorkFlow,
        Pages.HasTemplate,
        COUNT(*) OVER() AS TotalCount
    FROM (
        SELECT DISTINCT
            ${modulePageSelect}
        ${from}
    ) AS Pages
    ORDER BY Pages.ModuleName, Pages.ModulePageName, Pages.ModulePageId
    OFFSET ${paging.offset} ROWS FETCH NEXT ${paging.pageSize} ROWS ONLY
  `;
  return {
    rows,
    totalCount: totalCountOf(rows[0]?.TotalCount),
    page: paging.page,
    pageSize: paging.pageSize,
  };
}

type MappingRow = {
  WorkflowId: number;
  WorkflowName: string;
  MappedPages: string | null;
  Isdefault: boolean | number | null;
  isenable: boolean | number | null;
  IsWorkflowPartial: boolean | number | null;
  WorkflowDefinitionTree: string | null;
};

function mapPages(
  pages: PageRow[],
  workflows: MappingRow[],
): WorkflowPageCatalogRow[] {
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

async function loadWorkflowMappings(db: HrmsDb, tenantId: number): Promise<MappingRow[]> {
  return db.$queryRaw<MappingRow[]>`
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
  `;
}

export async function listWorkflowPages(
  db: HrmsDb,
  employerId: number,
  filters: { page?: number | null; q?: string | null; name?: string | null } = {},
): Promise<WorkflowPageCatalogPage> {
  const tenantId = parseEmployerId(employerId);
  const [listed, workflows] = await Promise.all([
    selectModulePages(db, tenantId, filters),
    loadWorkflowMappings(db, tenantId),
  ]);
  return {
    rows: mapPages(listed.rows, workflows),
    totalCount: listed.totalCount,
    page: listed.page,
    pageSize: listed.pageSize,
  };
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
  const tenantId = parseEmployerId(employerId);
  const listed = await selectModulePages(db, tenantId, null);
  return mapPages(listed.rows, []).map((page) => ({
    modulePageId: page.modulePageId,
    modulePageName: page.modulePageName,
    moduleId: page.moduleId,
    moduleName: page.moduleName,
    isNotificationOnly: page.isNotificationOnly,
  }));
}
