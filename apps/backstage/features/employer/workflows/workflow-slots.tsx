import { WorkflowPanel } from "@/features/employer/workflows/workflow-panel";
import {
  listMappablePages,
  listWorkflowBusinessUnits,
  listWorkflowGroups,
  listWorkflowLocations,
  listWorkflowModules,
  type WorkflowDefinition,
} from "@/features/employer/workflows/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function WorkflowEditorSlot({
  employerId,
  workflow,
}: {
  employerId: number;
  workflow: WorkflowDefinition | null;
}): Promise<React.JSX.Element> {
  const [pages, groups, locations, businessUnits, modules, writesEnabled] = await Promise.all([
    listMappablePages(employerId),
    listWorkflowGroups(employerId),
    listWorkflowLocations(employerId),
    listWorkflowBusinessUnits(employerId),
    listWorkflowModules(employerId),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  return (
    <WorkflowPanel
      businessUnits={businessUnits}
      employerId={employerId}
      groups={groups}
      locations={locations}
      modules={modules}
      pages={pages}
      workflow={workflow}
      writesEnabled={writesEnabled}
    />
  );
}
