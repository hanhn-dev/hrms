export type Employee360Area =
  | "profile"
  | "history"
  | "change-requests"
  | "sections"
  | "business-unit"
  | "login"
  | "access"
  | "leave"
  | "approvers";

const EMPLOYEE_360_TITLES: Record<Employee360Area, string> = {
  profile: "Profile",
  history: "History",
  "change-requests": "Change requests",
  sections: "Sections",
  "business-unit": "Business unit",
  login: "Login",
  access: "Access",
  leave: "Leave",
  approvers: "Approvers",
};

/** Area segment after `/employers/{id}/employees/{employmentNumber}`. */
export function employee360Area(
  pathname: string,
  employerBase: string,
): Employee360Area | null {
  const prefix = `${employerBase}/employees/`;
  if (!pathname.startsWith(prefix)) return null;
  const parts = pathname.slice(prefix.length).split("/").filter(Boolean);
  if (parts.length === 0) return null;
  const segment = parts[1] ?? "";
  switch (segment) {
    case "history":
    case "change-requests":
    case "sections":
    case "business-unit":
    case "login":
    case "access":
    case "leave":
    case "approvers":
      return segment;
    default:
      return "profile";
  }
}

export function employee360Title(area: Employee360Area): string {
  return EMPLOYEE_360_TITLES[area];
}
