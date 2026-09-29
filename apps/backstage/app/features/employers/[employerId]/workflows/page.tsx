import { parseWorkflowsTab, WorkflowsScreen } from "@/features/employer/workflows";
import { parsePositiveInt } from "@/shared/routing";

export default async function WorkflowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ tab?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <WorkflowsScreen
      employerId={parsePositiveInt(employerId)}
      tab={parseWorkflowsTab(query.tab)}
    />
  );
}
