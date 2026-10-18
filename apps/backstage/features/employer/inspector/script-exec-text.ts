export type ExecParameter = {
  readonly name: string;
  readonly dataType: string;
  readonly mode?: "in" | "out" | "inout";
};

const NUMERIC_TYPES = new Set([
  "int",
  "bigint",
  "smallint",
  "tinyint",
  "decimal",
  "numeric",
  "money",
  "smallmoney",
  "float",
  "real",
]);

const NATIONAL_TYPES = new Set(["nvarchar", "nchar", "ntext", "xml", "sysname"]);

const NUMBER_LITERAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

function baseType(dataType: string): string {
  return dataType.trim().toLowerCase().split("(")[0]?.trim() ?? "";
}

function sqlString(value: string, national: boolean): string {
  const quoted = `'${value.replaceAll("'", "''")}'`;
  return national ? `N${quoted}` : quoted;
}

function literal(dataType: string, raw: string): string {
  const value = raw.trim();
  if (value === "") {
    return "NULL";
  }

  const type = baseType(dataType);
  if (type === "bit") {
    const normalized = value.toLowerCase();
    if (normalized === "1" || normalized === "true") {
      return "1";
    }
    if (normalized === "0" || normalized === "false") {
      return "0";
    }
    return sqlString(value, false);
  }

  if (NUMERIC_TYPES.has(type) && NUMBER_LITERAL.test(value) && Number.isFinite(Number(value))) {
    return value;
  }

  return sqlString(value, NATIONAL_TYPES.has(type));
}

export function formatExecScript(
  schema: string,
  name: string,
  parameters: readonly ExecParameter[],
  values: Readonly<Record<string, string>>,
): string {
  const header = `EXEC ${schema}.${name}`;
  if (parameters.length === 0) {
    return header;
  }

  const lines = parameters.map((parameter, index) => {
    const output = parameter.mode === "out" || parameter.mode === "inout" ? " OUTPUT" : "";
    const comma = index === parameters.length - 1 ? "" : ",";
    const value = literal(parameter.dataType, values[parameter.name] ?? "");
    return `\t${parameter.name} = ${value}${output}${comma}`;
  });

  return [header, ...lines].join("\n");
}
