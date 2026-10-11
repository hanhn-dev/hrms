import { Card } from "antd";
import { IterationList } from "@/features/azure/sprints/iteration-list";
import { IterationWorkItemsTable } from "@/features/azure/sprints/iteration-work-items-table";
import {
  listIterationWorkItems,
  listIterations,
} from "@/features/azure/sprints/queries";

export async function IterationsSlot({
  selectedIterationPath,
}: {
  selectedIterationPath?: string;
}): Promise<React.JSX.Element> {
  const iterations = await listIterations();
  return (
    <Card className="mb-4" title="Sprints">
      <IterationList
        iterations={iterations}
        selectedIterationPath={selectedIterationPath}
      />
    </Card>
  );
}

export async function IterationWorkItemsSlot({
  iterationPath,
}: {
  iterationPath: string;
}): Promise<React.JSX.Element> {
  const workItems = await listIterationWorkItems(iterationPath);
  return (
    <Card title={`Work items — ${iterationPath}`}>
      <IterationWorkItemsTable workItems={workItems} />
    </Card>
  );
}
