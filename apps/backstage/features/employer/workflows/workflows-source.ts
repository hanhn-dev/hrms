export const WORKFLOW_TABS = ["workflows", "pages", "groups", "requests"] as const;

export type WorkflowsTab = (typeof WORKFLOW_TABS)[number];

export function parseWorkflowsTab(value: string | undefined): WorkflowsTab {
  if (value === "pages" || value === "groups" || value === "requests") {
    return value;
  }
  return "workflows";
}

export function parseWorkflowFocus(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

export function parseWorkflowGroupId(value: string | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function workflowsHref(
  employerId: number,
  tab: WorkflowsTab = "workflows",
): string {
  const search = tab === "workflows" ? "" : `?tab=${tab}`;
  return `/employers/${employerId}/workflows${search}`;
}

export function workflowHref(employerId: number, workflowId: number | "new"): string {
  return `/employers/${employerId}/workflows/${workflowId}`;
}
