export function asIso(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
}

export function asYesNo(value: boolean): "Y" | "N" {
  return value ? "Y" : "N";
}
