export function namesMatch(
  value: string | null | undefined,
  focus: string | null | undefined,
): boolean {
  const left = value?.trim().toLowerCase() ?? "";
  const right = focus?.trim().toLowerCase() ?? "";
  return left.length > 0 && left === right;
}

export function groupIdMatches(roleId: number, focus: number | null): boolean {
  return focus != null && roleId === focus;
}
