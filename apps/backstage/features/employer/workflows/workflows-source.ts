export const WORKFLOW_TABS = ["workflows", "pages", "groups", "requests"] as const;

export type WorkflowsTab = (typeof WORKFLOW_TABS)[number];

export function parseWorkflowsTab(value: string | undefined): WorkflowsTab {
  if (value === "pages" || value === "groups" || value === "requests") {
    return value;
  }
  return "workflows";
}

export function workflowsHref(
  employerId: number,
  tab: WorkflowsTab = "workflows",
): string {
  const search = tab === "workflows" ? "" : `?tab=${tab}`;
  return `/features/employers/${employerId}/workflows${search}`;
}

export function workflowHref(employerId: number, workflowId: number | "new"): string {
  return `/features/employers/${employerId}/workflows/${workflowId}`;
}
