const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type FunctionCallShape = "scalar" | "table";

export type FunctionParameterSpec = {
  name: string;
  dataType: string;
  systemType: string;
  isTableType: boolean;
};

const STRING_LIKE_TYPES = new Set([
  "varchar",
  "nvarchar",
  "char",
  "nchar",
  "text",
  "ntext",
  "xml",
  "json",
  "sysname",
]);

const INTEGER_TYPES = new Set(["int", "bigint", "smallint", "tinyint"]);
const DECIMAL_TYPES = new Set([
  "decimal",
  "numeric",
  "money",
  "smallmoney",
  "float",
  "real",
]);
const DATETIME_TYPES = new Set([
  "date",
  "datetime",
  "datetime2",
  "smalldatetime",
  "datetimeoffset",
  "time",
]);
const UNSUPPORTED_TYPES = new Set([
  "geography",
  "geometry",
  "hierarchyid",
  "sql_variant",
]);
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function assertIdent(name: string): string {
  if (!SQL_IDENT.test(name)) {
    throw new Error(`Refusing to use identifier ${name}.`);
  }
  return name;
}

export function functionCallShape(typeCode: string): FunctionCallShape {
  const code = typeCode.trim().toUpperCase();
  if (code === "FN") {
    return "scalar";
  }
  if (code === "IF" || code === "TF") {
    return "table";
  }
  throw new Error(
    `Function type ${typeCode.trim() || "(empty)"} cannot be executed.`,
  );
}

/** SQL text for the call shape. `?` marks a bound value and is never filled here. */
export function functionCallText(input: {
  schema: string;
  name: string;
  typeCode: string;
  parameterCount: number;
  top: number;
}): string {
  const shape = functionCallShape(input.typeCode);
  if (!Number.isInteger(input.parameterCount) || input.parameterCount < 0) {
    throw new Error("Parameter count must be a non-negative integer.");
  }
  const qualified = `[${assertIdent(input.schema)}].[${assertIdent(input.name)}]`;
  const slots = Array.from({ length: input.parameterCount }, () => "?").join(", ");
  const call = `${qualified}(${slots})`;
  if (shape === "scalar") {
    return `SELECT ${call} AS [value]`;
  }
  if (!Number.isInteger(input.top) || input.top < 1) {
    throw new Error("Row limit must be a positive integer.");
  }
  return `SELECT TOP (${input.top}) * FROM ${call}`;
}

export function bindFunctionPayload(
  parameters: readonly FunctionParameterSpec[],
  payload: Record<string, unknown>,
): unknown[] {
  return parameters.map((parameter) => {
    if (parameter.isTableType) {
      throw new Error(
        `Table-valued parameter ${parameter.name} (${parameter.dataType}) is not supported. Flatten or omit this key.`,
      );
    }
    return coerceFunctionArgument(
      parameter,
      payloadValue(payload, parameter.name),
    );
  });
}

function payloadValue(
  payload: Record<string, unknown>,
  name: string,
): unknown {
  if (name in payload) {
    return payload[name];
  }
  const bare = name.startsWith("@") ? name.slice(1) : name;
  if (bare in payload) {
    return payload[bare];
  }
  const withAt = `@${bare}`;
  if (withAt in payload) {
    return payload[withAt];
  }
  const found = Object.keys(payload).find(
    (key) => key.replace(/^@/, "").toLowerCase() === bare.toLowerCase(),
  );
  return found ? payload[found] : "";
}

function coerceFunctionArgument(
  parameter: FunctionParameterSpec,
  value: unknown,
): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  const systemType = parameter.systemType.trim().toLowerCase();
  if (UNSUPPORTED_TYPES.has(systemType)) {
    throw new Error(
      `Cannot bind ${parameter.name} (${parameter.dataType}): type ${systemType} is not supported.`,
    );
  }
  if (STRING_LIKE_TYPES.has(systemType)) {
    return typeof value === "string" ? value : String(value);
  }
  if (systemType === "bit") {
    return coerceBit(value, parameter);
  }
  if (INTEGER_TYPES.has(systemType) || DECIMAL_TYPES.has(systemType)) {
    const numeric = parseNumeric(value);
    if (numeric === null) {
      throw new Error(
        `Cannot bind ${parameter.name} (${parameter.dataType}): expected a number.`,
      );
    }
    return numeric;
  }
  if (DATETIME_TYPES.has(systemType)) {
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
    throw new Error(
      `Cannot bind ${parameter.name} (${parameter.dataType}): expected a date string.`,
    );
  }
  if (systemType === "uniqueidentifier") {
    if (typeof value === "string" && UUID_PATTERN.test(value.trim())) {
      return value.trim();
    }
    throw new Error(
      `Cannot bind ${parameter.name} (${parameter.dataType}): expected a UUID string.`,
    );
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  throw new Error(
    `Cannot bind ${parameter.name} (${parameter.dataType}).`,
  );
}

function coerceBit(value: unknown, parameter: FunctionParameterSpec): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 0 || value === 1) {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  throw new Error(
    `Cannot bind ${parameter.name} (${parameter.dataType}): expected a boolean.`,
  );
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
