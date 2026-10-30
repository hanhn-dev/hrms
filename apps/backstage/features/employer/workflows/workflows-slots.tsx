import { captureQueryScript, LIST_PAGE_SIZE } from "@hrms/db";
import { WorkflowsPanel } from "@/features/employer/workflows/workflows-panel";
import type { WorkflowsTab } from "@/features/employer/workflows/workflows-source";
import {
  getWorkflowSettings,
  listChangeRequests,
  listWorkflowGroups,
  listWorkflowPages,
  listWorkflows,
} from "@/features/employer/workflows/queries";
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function WorkflowPartialNote({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const settings = await getWorkflowSettings(employerId);
  return (
    <PageHelp
      source="workflows-partial"
      notes={[
        settings.allowPartialWorkflow
          ? {
              id: "partial-allowed",
              type: "warning",
              title: "Partial workflows are allowed",
              description:
                "TCustomerSettings.AllowPartialWorkflow is on. Incomplete trees can still be used at runtime.",
            }
          : {
              id: "partial-ignored",
              type: "info",
              title: "Partial workflows are ignored at runtime",
              description:
                "A tree missing approvers or notifications is treated as not defined unless AllowPartialWorkflow is enabled.",
            },
      ]}
    />
  );
}

const EMPTY_REQUESTS = {
  rows: [],
  totalCount: 0,
  page: 1,
  pageSize: LIST_PAGE_SIZE,
  statusCounts: { all: 0, pending: 0, approved: 0, rejected: 0 },
  workflowCounts: [],
};

export async function WorkflowsTabSlot({
  employerId,
  tab,
  pageName,
  groupId,
  requestId,
  listPage,
  listPageSize,
  listSearch,
  requestStatus,
  writesEnabled,
}: {
  employerId: number;
  tab: WorkflowsTab;
  pageName: string | null;
  groupId: number | null;
  requestId: number | null;
  listPage: number;
  listPageSize: number;
  listSearch: string | null;
  requestStatus: "pending" | "approved" | "rejected" | "all";
  writesEnabled: boolean;
}): Promise<React.JSX.Element> {
  const workflows =
    tab === "workflows"
      ? await captureQueryScript(() =>
          listWorkflows(employerId, { page: listPage, pageSize: listPageSize, q: listSearch }),
        )
      : {
          result: { rows: [], totalCount: 0, page: 1, pageSize: LIST_PAGE_SIZE },
          script: "",
        };
  const emptyPage = { rows: [], totalCount: 0, page: 1, pageSize: LIST_PAGE_SIZE };
  let pages =
    tab === "pages"
      ? await captureQueryScript(() =>
          listWorkflowPages(employerId, {
            page: pageName ? 1 : listPage,
            pageSize: listPageSize,
            q: pageName ? null : listSearch,
            name: pageName,
          }),
        )
      : { result: emptyPage, script: "" };
  if (tab === "pages" && pageName && pages.result.rows.length === 0) {
    pages = await captureQueryScript(() =>
      listWorkflowPages(employerId, { page: listPage, pageSize: listPageSize, q: listSearch }),
    );
  }
  let groups =
    tab === "groups"
      ? await captureQueryScript(() =>
          listWorkflowGroups(employerId, {
            page: groupId == null ? listPage : 1,
            pageSize: listPageSize,
            q: groupId == null ? listSearch : null,
            roleId: groupId,
          }),
        )
      : { result: emptyPage, script: "" };
  if (tab === "groups" && groupId != null && groups.result.rows.length === 0) {
    groups = await captureQueryScript(() =>
      listWorkflowGroups(employerId, { page: listPage, pageSize: listPageSize, q: listSearch }),
    );
  }
  const changeRequests =
    tab === "requests"
      ? await captureQueryScript(() =>
          listChangeRequests(employerId, {
            page: listPage,
            pageSize: listPageSize,
            q: listSearch,
            status: requestStatus,
          }),
        )
      : { result: EMPTY_REQUESTS, script: "" };

  return (
    <WorkflowsPanel
      changeRequests={changeRequests.result}
      changeRequestsScript={changeRequests.script}
      listSearch={listSearch}
      listPageSize={listPageSize}
      requestStatus={requestStatus}
      employerId={employerId}
      groupId={groupId}
      groupPage={groups.result.page}
      groupPageSize={groups.result.pageSize}
      groupTotal={groups.result.totalCount}
      groups={groups.result.rows}
      groupsScript={groups.script}
      pageName={pageName}
      pagePage={pages.result.page}
      pagePageSize={pages.result.pageSize}
      pageTotal={pages.result.totalCount}
      pages={pages.result.rows}
      pagesScript={pages.script}
      requestId={requestId}
      tab={tab}
      workflowPage={workflows.result.page}
      workflowPageSize={workflows.result.pageSize}
      workflowTotal={workflows.result.totalCount}
      workflows={workflows.result.rows}
      workflowsScript={workflows.script}
      writesEnabled={writesEnabled}
    />
  );
}
