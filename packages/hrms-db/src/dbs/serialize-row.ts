function isBinary(value: object): value is { byteLength: number } {
  return (
    "byteLength" in value &&
    typeof (value as { byteLength: unknown }).byteLength === "number"
  );
}

/** Prisma names this class Decimal2, but its tag is Decimal. Next.js rejects that tag. */
function isDecimal(value: object): boolean {
  return Object.prototype.toString.call(value) === "[object Decimal]";
}

export function serializeSqlValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value != null && typeof value === "object") {
    if (isDecimal(value)) {
      return String(value);
    }
    if (isBinary(value)) {
      return `[binary ${value.byteLength} bytes]`;
    }
  }
  return value;
}

export function serializeRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = serializeSqlValue(value);
  }
  return out;
}
