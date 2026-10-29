import {
  parseWorkflowFocus,
  parseWorkflowGroupId,
  parseWorkflowsTab,
  WorkflowsScreen,
} from "@/features/employer/workflows";
import { readListPage, readListSearch } from "@/shared/list-query";
import { parsePositiveInt } from "@/shared/routing";

function requestStatus(
  value: string | undefined,
): "pending" | "approved" | "rejected" | "all" {
  if (value === "approved" || value === "rejected" || value === "all") {
    return value;
  }
  return "pending";
}

export default async function WorkflowsPage({
  params,
  searchParams,
}: {
  params: Promise<{ employerId: string }>;
  searchParams: Promise<{
    tab?: string;
    page?: string;
    group?: string;
    request?: string;
    p?: string;
    q?: string;
    status?: string;
  }>;
}): Promise<React.JSX.Element> {
  const [{ employerId }, query] = await Promise.all([params, searchParams]);
  return (
    <WorkflowsScreen
      employerId={parsePositiveInt(employerId)}
      groupId={parseWorkflowGroupId(query.group)}
      listPage={readListPage(query.p)}
      listSearch={readListSearch(query.q)}
      pageName={parseWorkflowFocus(query.page)}
      requestId={parseWorkflowGroupId(query.request)}
      requestStatus={requestStatus(query.status)}
      tab={parseWorkflowsTab(query.tab)}
    />
  );
}
