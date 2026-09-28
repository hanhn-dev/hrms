import { Alert } from "antd";
import { WorkflowPanel } from "@/features/employer/workflows/workflow-panel";
import {
  getWorkflow,
  listMappablePages,
  listWorkflowBusinessUnits,
  listWorkflowGroups,
  listWorkflowLocations,
  listWorkflowModules,
} from "@/features/employer/workflows/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";
import { PageHelp } from "@/shared/ui/shell-header-context";

export async function WorkflowScreen({
  employerId,
  workflowId,
}: {
  employerId: number;
  workflowId: number | "new";
}): Promise<React.JSX.Element> {
  const [workflow, pages, groups, locations, businessUnits, modules] = await Promise.all([
    workflowId === "new" ? Promise.resolve(null) : getWorkflow(employerId, workflowId),
    listMappablePages(employerId),
    listWorkflowGroups(employerId),
    listWorkflowLocations(employerId),
    listWorkflowBusinessUnits(employerId),
    listWorkflowModules(employerId),
  ]);

  if (workflowId !== "new" && !workflow) {
    return <Alert showIcon type="error" title="Workflow was not found for this employer." />;
  }

  return (
    <>
      <PageHelp
        source="workflows"
        notes={[
          {
            id: "config-only",
            type: "info",
            title: "Configuration only",
            description:
              "Editing a workflow changes future requests. In-flight TRequestWorkflows rows keep the approvers already resolved.",
          },
        ]}
      />
      <WorkflowPanel
        businessUnits={businessUnits}
        employerId={employerId}
        groups={groups}
        locations={locations}
        modules={modules}
        pages={pages}
        workflow={workflow}
        writesEnabled={areWritesEnabled(await getSelectedEnvironment())}
      />
    </>
  );
}
