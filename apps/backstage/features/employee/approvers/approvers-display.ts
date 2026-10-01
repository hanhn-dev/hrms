export function personLabel(person: {
  name: string;
  employmentNumber: string | null;
}): string {
  const number = person.employmentNumber?.trim();
  return number ? `${person.name} (${number})` : person.name;
}

export function approverLabel(person: {
  name: string;
  employmentNumber: string | null;
}): string {
  const number = person.employmentNumber?.trim();
  return number || person.name;
}

export function filterApproverRows<
  T extends {
    moduleName: string;
    pageName: string;
    workflowName: string | null;
  },
>(rows: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return rows;
  }
  return rows.filter((row) => {
    const workflow = row.workflowName ?? "";
    return (
      row.moduleName.toLowerCase().includes(needle) ||
      row.pageName.toLowerCase().includes(needle) ||
      workflow.toLowerCase().includes(needle)
    );
  });
}
