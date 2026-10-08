import type { EmployerListItem } from "@/features/employer/picker/queries";

export function employerMatchesQuery(
  employer: Pick<EmployerListItem, "employerId" | "employerName">,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  if (employer.employerName.toLowerCase().includes(needle)) {
    return true;
  }
  return String(employer.employerId).includes(needle);
}
