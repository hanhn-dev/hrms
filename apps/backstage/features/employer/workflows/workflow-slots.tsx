import { WorkflowDetailsPanel } from "@/features/employer/workflows/workflow-panel";
import { WorkflowTreePanel } from "@/features/employer/workflows/workflow-tree-panel";
import {
  listMappablePages,
  listWorkflowActorGroups,
  listWorkflowBusinessUnits,
  listWorkflowLocations,
  listWorkflowModules,
  type WorkflowDefinition,
} from "@/features/employer/workflows/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function WorkflowDetailsSlot({
  employerId,
  workflow,
}: {
  employerId: number;
  workflow: WorkflowDefinition | null;
}): Promise<React.JSX.Element> {
  const [pages, locations, businessUnits, modules, writesEnabled] = await Promise.all([
    listMappablePages(employerId),
    listWorkflowLocations(employerId, { includeIds: workflow?.locationIds ?? [] }),
    listWorkflowBusinessUnits(employerId, {
      includeIds: workflow?.businessUnitIds ?? [],
    }),
    listWorkflowModules(employerId),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  return (
    <WorkflowDetailsPanel
      businessUnits={businessUnits}
      employerId={employerId}
      locations={locations}
      modules={modules}
      pages={pages}
      workflow={workflow}
      writesEnabled={writesEnabled}
    />
  );
}

export async function WorkflowTreeSlot({
  employerId,
  workflow,
}: {
  employerId: number;
  workflow: WorkflowDefinition;
}): Promise<React.JSX.Element> {
  const [groups, writesEnabled] = await Promise.all([
    listWorkflowActorGroups(employerId),
    getSelectedEnvironment().then((environment) => areWritesEnabled(environment)),
  ]);

  return (
    <WorkflowTreePanel
      employerId={employerId}
      groups={groups}
      workflow={workflow}
      writesEnabled={writesEnabled}
    />
  );
}
