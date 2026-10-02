import { Prisma } from "../../generated/prisma/client.ts";

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertSqlIdent(name: string): string {
  if (!SQL_IDENT.test(name)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return name;
}

export function sqlIdent(name: string): Prisma.Sql {
  return Prisma.raw(`[${assertSqlIdent(name)}]`);
}

export function sqlTable(name: string): Prisma.Sql {
  return Prisma.raw(`dbo.[${assertSqlIdent(name)}]`);
}

export function rowValue(
  row: Record<string, unknown>,
  ...candidates: string[]
): unknown {
  for (const key of candidates) {
    if (key in row) {
      return row[key];
    }
    const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found) {
      return row[found];
    }
  }
  return undefined;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

export function asTimeStampIso(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return value.trim();
  }
  return null;
}

export function isTruthyDeleted(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "Y" ||
    value === "y"
  );
}
