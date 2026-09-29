import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { parseEmployerId } from "../../shared/ids";
import { assertSqlIdent, sqlIdent, sqlTable } from "../history/sql";
import type { SoftDeleteSpec } from "./record-registry";

export function softDeleteActiveSql(softDelete: SoftDeleteSpec): Prisma.Sql {
  switch (softDelete.kind) {
    case "yn": {
      const col = sqlIdent(softDelete.column);
      return Prisma.sql`(${col} IS NULL OR ${col} = N'N')`;
    }
    case "bit-null-or-zero": {
      const col = sqlIdent(softDelete.column);
      return Prisma.sql`(${col} IS NULL OR ${col} = 0)`;
    }
    case "bit-zero": {
      const col = sqlIdent(softDelete.column);
      return Prisma.sql`${col} = 0`;
    }
    case "bit-null": {
      const col = sqlIdent(softDelete.column);
      return Prisma.sql`${col} IS NULL`;
    }
    case "bank":
      return Prisma.sql`ISNULL([Show], 1) = 1 AND ISNULL([IsDelete], 0) = 0`;
    case "none":
      return Prisma.sql`1 = 1`;
  }
}

export function softDeleteMarkSql(softDelete: SoftDeleteSpec): Prisma.Sql {
  switch (softDelete.kind) {
    case "yn":
      return Prisma.sql`${sqlIdent(softDelete.column)} = N'Y'`;
    case "bit-null-or-zero":
    case "bit-zero":
    case "bit-null":
      return Prisma.sql`${sqlIdent(softDelete.column)} = 1`;
    case "bank":
      return Prisma.sql`[IsDelete] = 1`;
    case "none":
      throw new Error("Soft-delete is not supported for this table.");
  }
}

const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Allowlisted table/column for exist/unique DB rule helpers. */
export function assertAllowlistedIdent(name: string): string {
  const trimmed = name.trim();
  if (!SQL_IDENT.test(trimmed)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return trimmed;
}

export { assertSqlIdent, sqlIdent, sqlTable, parseEmployerId };
