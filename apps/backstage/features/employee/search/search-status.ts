export const EMPLOYEE_STATUS_FILTERS = [
  { text: "Active", value: "active" },
  { text: "Active-Resigned", value: "active-resigned" },
  { text: "Inactive", value: "inactive" },
] as const;

/** Display label for the status returned by employee search. */
export function employeeStatusLabel(status: string | null | undefined): string {
  if (status === "Active") return "Active";
  if (status === "Active-Resigned") return "Active-Resigned";
  if (status === "InActive") return "Inactive";
  return "—";
}

export function employeeStatusColor(
  status: string | null | undefined,
): "green" | "gold" | "red" | "default" {
  if (status === "Active") return "green";
  if (status === "Active-Resigned") return "gold";
  if (status === "InActive") return "red";
  return "default";
}

export function matchesEmployeeStatusFilter(
  status: string | null | undefined,
  filter: unknown,
): boolean {
  const value = String(filter);
  if (value === "active") return status === "Active";
  if (value === "active-resigned") return status === "Active-Resigned";
  if (value === "inactive") return status === "InActive";
  return false;
}
