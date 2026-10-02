export type TableColumnDefinition = {
  name: string;
  typeName: string;
  maxLength: number;
  precision: number;
  scale: number;
  nullable: boolean;
  identity: boolean;
  primaryKey: boolean;
};

const LENGTH_TYPES = new Set([
  "char",
  "varchar",
  "nchar",
  "nvarchar",
  "binary",
  "varbinary",
]);

const CHAR_LENGTH_TYPES = new Set(["nchar", "nvarchar"]);

const PRECISION_SCALE_TYPES = new Set(["decimal", "numeric"]);

const SCALE_TYPES = new Set(["datetime2", "datetimeoffset", "time"]);

export function formatTableType(
  column: Pick<
    TableColumnDefinition,
    "typeName" | "maxLength" | "precision" | "scale"
  >,
): string {
  const typeName = column.typeName.toLowerCase();
  if (LENGTH_TYPES.has(typeName)) {
    if (column.maxLength < 0) {
      return `${typeName}(max)`;
    }
    const length = CHAR_LENGTH_TYPES.has(typeName)
      ? column.maxLength / 2
      : column.maxLength;
    return `${typeName}(${length})`;
  }
  if (PRECISION_SCALE_TYPES.has(typeName)) {
    return `${typeName}(${column.precision},${column.scale})`;
  }
  if (SCALE_TYPES.has(typeName)) {
    return `${typeName}(${column.scale})`;
  }
  if (typeName === "float" && column.precision !== 53) {
    return `float(${column.precision})`;
  }
  return typeName;
}

export function formatTableDefinitionLine(column: TableColumnDefinition): string {
  const parts = [column.name, formatTableType(column)];
  if (column.identity) {
    parts.push("IDENTITY");
  }
  parts.push(column.nullable ? "NULL" : "NOT NULL");
  if (column.primaryKey) {
    parts.push("PK");
  }
  return parts.join(" ");
}
