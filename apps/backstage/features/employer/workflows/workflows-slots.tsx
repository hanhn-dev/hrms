import { captureQueryScript } from "@hrms/db";
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

export async function WorkflowsTabSlot({
  employerId,
  tab,
  pageName,
  groupId,
  requestId,
  writesEnabled,
}: {
  employerId: number;
  tab: WorkflowsTab;
  pageName: string | null;
  groupId: number | null;
  requestId: number | null;
  writesEnabled: boolean;
}): Promise<React.JSX.Element> {
  const workflows =
    tab === "workflows"
      ? await captureQueryScript(() => listWorkflows(employerId))
      : { result: [], script: "" };
  const pages =
    tab === "pages"
      ? await captureQueryScript(() => listWorkflowPages(employerId))
      : { result: [], script: "" };
  const groups =
    tab === "groups"
      ? await captureQueryScript(() => listWorkflowGroups(employerId))
      : { result: [], script: "" };
  const changeRequests =
    tab === "requests"
      ? await captureQueryScript(() => listChangeRequests(employerId))
      : { result: [], script: "" };

  return (
    <WorkflowsPanel
      changeRequests={changeRequests.result}
      changeRequestsScript={changeRequests.script}
      employerId={employerId}
      groupId={groupId}
      groups={groups.result}
      groupsScript={groups.script}
      pageName={pageName}
      pages={pages.result}
      pagesScript={pages.script}
      requestId={requestId}
      tab={tab}
      workflows={workflows.result}
      workflowsScript={workflows.script}
      writesEnabled={writesEnabled}
    />
  );
}
