import { Suspense } from "react";
import { Alert } from "antd";
import { WorkflowHeading } from "@/features/employer/workflows/workflow-panel";
import { WorkflowEditorSlot } from "@/features/employer/workflows/workflow-slots";
import { getWorkflow } from "@/features/employer/workflows/queries";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function WorkflowScreen({
  employerId,
  workflowId,
}: {
  employerId: number;
  workflowId: number | "new";
}): Promise<React.JSX.Element> {
  const workflow = workflowId === "new" ? null : await getWorkflow(employerId, workflowId);
  if (workflowId !== "new" && !workflow) {
    return <Alert showIcon type="error" title="Workflow was not found for this employer." />;
  }

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
      <Suspense fallback={<SectionFallback title="Workflow editor" />}>
        <WorkflowEditorSlot employerId={employerId} workflow={workflow} />
      </Suspense>
    </>
  );
}
