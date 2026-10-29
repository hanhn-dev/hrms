export type AccessibleEmployerInput = {
  isGlobalAccess: string | null;
  employerIds: string | null;
  ownEmployerId: number;
};

/**
 * Employer ids this person can open, matching SP_GetAccessibleEmployerIds.
 * Global access with a non-empty EmployerIds list uses that list. Otherwise
 * only the employee's own employer is included.
 */
export function accessibleEmployerIds(input: AccessibleEmployerInput): number[] {
  const listed = input.employerIds?.trim() ?? "";
  if (input.isGlobalAccess?.trim() === "Y" && listed !== "") {
    return uniquePositiveIds(listed);
  }
  return positiveEmployerId(input.ownEmployerId);
}

function uniquePositiveIds(raw: string): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!/^\d+$/.test(token)) {
      continue;
    }
    const id = Number(token);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function positiveEmployerId(value: number): number[] {
  if (!Number.isInteger(value) || value <= 0) {
    return [];
  }
  return [value];
}
