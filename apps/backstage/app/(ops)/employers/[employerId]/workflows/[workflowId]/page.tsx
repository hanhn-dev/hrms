import { parseWorkflowDetailTab, WorkflowScreen } from "@/features/employer/workflows";
import { parsePositiveInt } from "@/shared/routing";

export default async function WorkflowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string; workflowId: string }>;
  searchParams: Promise<{ tab?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId, workflowId }, query] = await Promise.all([params, searchParams]);
  return (
    <WorkflowScreen
      employerId={parsePositiveInt(employerId)}
      tab={
        workflowId === "new" ? "details" : parseWorkflowDetailTab(query.tab)
      }
      workflowId={workflowId === "new" ? "new" : parsePositiveInt(workflowId)}
    />
  );
}
