export function changeRequestApproverText(person: {
  name: string;
  employmentNumber: string | null;
}): string {
  return person.employmentNumber?.trim() || person.name;
}

export function changeRequestApproverSearchValues(
  approvers: Array<{ name: string; employmentNumber: string | null }>,
): string[] {
  return approvers.flatMap((person) =>
    [person.name, person.employmentNumber].filter((value): value is string =>
      Boolean(value?.trim()),
    ),
  );
}
