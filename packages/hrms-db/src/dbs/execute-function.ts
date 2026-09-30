import { Prisma } from "../generated/prisma/client";
import type { HrmsDb } from "../shared/client";
import { assertSqlIdent } from "../employee/history/sql";
import {
  bindFunctionPayload,
  functionCallShape,
  type FunctionCallShape,
  type FunctionParameterSpec,
} from "./function-call";
import { serializeRow } from "./serialize-row";

const DEFAULT_FUNCTION_ROWS = 20;
const MAX_FUNCTION_ROWS = 50;

export type ExecuteFunctionInput = {
  schema: string;
  name: string;
  payload: Record<string, unknown>;
  maxRows?: number;
};

export type ExecuteFunctionResult = {
  schema: string;
  name: string;
  shape: FunctionCallShape;
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
};

type FunctionTypeRow = {
  TypeCode: string;
};

type FunctionParameterRow = {
  ParameterName: string;
  SystemType: string | null;
  DataType: string | null;
  IsTableType: boolean | number | null;
};

function clampRows(maxRows: number | undefined): number {
  if (maxRows === undefined || !Number.isFinite(maxRows)) {
    return DEFAULT_FUNCTION_ROWS;
  }
  return Math.min(MAX_FUNCTION_ROWS, Math.max(1, Math.trunc(maxRows)));
}

function argumentList(values: readonly unknown[]): Prisma.Sql {
  if (values.length === 0) {
    return Prisma.empty;
  }
  return Prisma.join(values.map((value) => Prisma.sql`${value}`));
}

function isTableType(value: boolean | number | null): boolean {
  return value === true || value === 1;
}

export async function executeFunction(
  db: HrmsDb,
  input: ExecuteFunctionInput,
): Promise<ExecuteFunctionResult> {
  const schema = assertSqlIdent(input.schema.trim() || "dbo");
  const name = assertSqlIdent(input.name.trim());
  const qualified = Prisma.raw(`[${schema}].[${name}]`);

  const typeRows = await db.$queryRaw<FunctionTypeRow[]>`
    SELECT RTRIM(Objects.type) AS TypeCode
    FROM sys.objects AS Objects
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Objects.schema_id
    WHERE Schemas.name = ${schema}
      AND Objects.name = ${name}
  `;
  const typeCode = typeRows[0]?.TypeCode;
  if (!typeCode) {
    throw new Error(`Function ${schema}.${name} was not found.`);
  }
  const shape = functionCallShape(typeCode);

  const parameterRows = await db.$queryRaw<FunctionParameterRow[]>`
    SELECT
        Parameters.name AS ParameterName,
        TYPE_NAME(Parameters.system_type_id) AS SystemType,
        TYPE_NAME(Parameters.user_type_id) AS DataType,
        Types.is_table_type AS IsTableType
    FROM sys.objects AS Objects
    INNER JOIN sys.schemas AS Schemas
        ON Schemas.schema_id = Objects.schema_id
    INNER JOIN sys.parameters AS Parameters
        ON Parameters.object_id = Objects.object_id
    INNER JOIN sys.types AS Types
        ON Types.user_type_id = Parameters.user_type_id
    WHERE Schemas.name = ${schema}
      AND Objects.name = ${name}
      AND Parameters.parameter_id > 0
    ORDER BY Parameters.parameter_id
  `;
  const parameters: FunctionParameterSpec[] = parameterRows.map((row) => ({
    name: row.ParameterName,
    dataType: row.DataType ?? row.SystemType ?? "unknown",
    systemType: row.SystemType ?? "",
    isTableType: isTableType(row.IsTableType),
  }));
  const values = bindFunctionPayload(parameters, input.payload);
  const args = argumentList(values);
  const top = clampRows(input.maxRows);
  const fetchTop = top + 1;

  const rows =
    shape === "scalar"
      ? await db.$queryRaw<Record<string, unknown>[]>`
          SELECT ${qualified}(${args}) AS [value]
        `
      : await db.$queryRaw<Record<string, unknown>[]>`
          SELECT TOP (${Prisma.raw(String(fetchTop))})
              *
          FROM ${qualified}(${args})
        `;

  const truncated = shape === "table" && rows.length > top;
  const limited = truncated ? rows.slice(0, top) : rows;

  return {
    schema,
    name,
    shape,
    rows: limited.map(serializeRow),
    rowCount: limited.length,
    truncated,
  };
}
