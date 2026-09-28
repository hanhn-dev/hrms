import { WorkflowScreen } from "@/features/employer/workflows";
import { parsePositiveInt } from "@/shared/routing";

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ employerId: string; workflowId: string }>;
}): Promise<React.JSX.Element> {
  const { employerId, workflowId } = await params;
  return (
    <WorkflowScreen
      employerId={parsePositiveInt(employerId)}
      workflowId={workflowId === "new" ? "new" : parsePositiveInt(workflowId)}
    />
  );
}
