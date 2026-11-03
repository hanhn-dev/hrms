import { Suspense } from "react";
import { Alert } from "antd";
import { WorkflowDetailTabs } from "@/features/employer/workflows/workflow-detail-tabs";
import { WorkflowHeading } from "@/features/employer/workflows/workflow-panel";
import {
  WorkflowDetailsSlot,
  WorkflowTreeSlot,
} from "@/features/employer/workflows/workflow-slots";
import { getWorkflow } from "@/features/employer/workflows/queries";
import type { WorkflowDetailTab } from "@/features/employer/workflows/workflows-source";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { PageHelp } from "@/shared/ui/shell-header-context";

const TAB_TITLE: Record<WorkflowDetailTab, string> = {
  details: "Workflow details",
  tree: "Approval tree",
};

export async function WorkflowScreen({
  employerId,
  workflowId,
  tab,
}: {
  employerId: number;
  workflowId: number | "new";
  tab: WorkflowDetailTab;
}): Promise<React.JSX.Element> {
  const workflow = workflowId === "new" ? null : await getWorkflow(employerId, workflowId);
  if (workflowId !== "new" && !workflow) {
    return <Alert showIcon type="error" title="Workflow was not found for this employer." />;
  }

  const isCreate = workflow == null;
  const activeTab: WorkflowDetailTab = isCreate ? "details" : tab;

  return (
    <>
      <PageHelp
        source="workflows"
        notes={[
          {
            id: "deactivate-workflow",
            type: "info",
            title: "Deactivate this workflow",
            description:
              "Turn the Enabled switch off, click Preview header save, then confirm the write. Writes must be enabled for the selected environment. This updates TWorkflowManagement.isenable only.",
          },
          {
            id: "config-only",
            type: "info",
            title: "Configuration only",
            description:
              "Editing a workflow changes future requests. In-flight TRequestWorkflows rows keep the approvers already resolved.",
          },
        ]}
      />
      <WorkflowHeading employerId={employerId} workflow={workflow} />
      <WorkflowDetailTabs
        employerId={employerId}
        tab={activeTab}
        workflowId={workflow ? workflow.workflowId : "new"}
      >
        <Suspense fallback={<SectionFallback title={TAB_TITLE[activeTab]} />}>
          {activeTab === "tree" && workflow ? (
            <WorkflowTreeSlot employerId={employerId} workflow={workflow} />
          ) : (
            <WorkflowDetailsSlot employerId={employerId} workflow={workflow} />
          )}
        </Suspense>
      </WorkflowDetailTabs>
    </>
  );
}
