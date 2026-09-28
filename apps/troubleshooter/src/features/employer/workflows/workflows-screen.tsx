import { WorkflowsPanel } from "@/features/employer/workflows/workflows-panel";
import type { WorkflowsTab } from "@/features/employer/workflows/workflows-source";
import {
  getWorkflowSettings,
  listChangeRequests,
  listWorkflowGroups,
  listWorkflowPages,
  listWorkflows,
} from "@/features/employer/workflows/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function WorkflowsScreen({
  employerId,
  tab,
}: {
  employerId: number;
  tab: WorkflowsTab;
}): Promise<React.JSX.Element> {
  const [workflows, pages, groups, settings, changeRequests] = await Promise.all([
    listWorkflows(employerId),
    listWorkflowPages(employerId),
    listWorkflowGroups(employerId),
    getWorkflowSettings(employerId),
    listChangeRequests(employerId),
  ]);
  const writesEnabled = areWritesEnabled(await getSelectedEnvironment());

  return (
    <>
      <PageHelp
        source="workflows"
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
          {
            id: "change-request-apply",
            type: "info",
            title: "Change-request approve",
            description:
              "The Requests tab lists My Details change requests for this employer. Approve applies the field diffs and closes the queue. It does not call the product stored procedure, send approval email, or insert the next routing level.",
          },
        ]}
      />
      <WorkflowsPanel
        changeRequests={changeRequests}
        employerId={employerId}
        groups={groups}
        pages={pages}
        tab={tab}
        workflows={workflows}
        writesEnabled={writesEnabled}
      />
    </>
  );
}
