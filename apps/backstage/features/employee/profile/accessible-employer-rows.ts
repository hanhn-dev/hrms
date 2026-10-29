export type AccessibleEmployerView = {
  employerId: number;
  label: string;
  applied: boolean;
};

export function accessibleEmployerRows(
  employers: Array<{ employerId: number; employerName: string | null }>,
  appliedEmployerId: number,
): AccessibleEmployerView[] {
  const rows = employers.map((employer) => {
    const name = employer.employerName?.trim() ?? "";
    return {
      employerId: employer.employerId,
      label: name === "" ? String(employer.employerId) : name,
      applied: employer.employerId === appliedEmployerId,
    };
  });
  rows.sort((left, right) => {
    if (left.applied !== right.applied) {
      return left.applied ? -1 : 1;
    }
    const byLabel = left.label.localeCompare(right.label, undefined, {
      sensitivity: "base",
    });
    if (byLabel !== 0) {
      return byLabel;
    }
    return left.employerId - right.employerId;
  });
  return rows;
}
