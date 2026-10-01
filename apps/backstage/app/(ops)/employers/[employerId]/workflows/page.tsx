import {
  parseWorkflowFocus,
  parseWorkflowGroupId,
  parseWorkflowsTab,
  WorkflowsScreen,
} from "@/features/employer/workflows";
import { parsePositiveInt } from "@/shared/routing";

export default async function WorkflowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{ tab?: string; page?: string; group?: string; request?: string }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <WorkflowsScreen
      employerId={parsePositiveInt(employerId)}
      groupId={parseWorkflowGroupId(query.group)}
      pageName={parseWorkflowFocus(query.page)}
      requestId={parseWorkflowGroupId(query.request)}
      tab={parseWorkflowsTab(query.tab)}
    />
  );
}
