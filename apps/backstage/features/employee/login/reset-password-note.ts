const RESET_EFFECT =
  "Sets the password to welcome123# and clears the lock, invalid attempts, and force-password-change.";

function isActiveUser(value: unknown): boolean {
  return String(value ?? "").trim().toUpperCase() === "Y";
}

export function resetPasswordNote(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return "No TUsers row for this employee.";
  }
  const inactive = rows.some((row) => !isActiveUser(row.IsActive));
  if (inactive) {
    return `${RESET_EFFECT} This account is inactive, so HRMS.Web login still rejects it.`;
  }
  return `${RESET_EFFECT} HRMS.Web login accepts that password.`;
}
