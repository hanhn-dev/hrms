const WIDE_TEXT_TYPES = new Set(["varchar", "nvarchar", "char", "nchar", "text", "ntext"]);

/** Pixel width shared by the header and body cell for one browse column. */
export function dataFixColumnWidth(name: string, typeName: string): number {
  const header = Math.min(280, Math.max(96, name.length * 8 + 32));
  if (WIDE_TEXT_TYPES.has(typeName.trim().toLowerCase())) {
    return Math.max(header, 180);
  }
  return header;
}

/** `scroll.x` must be this sum so Ant Design does not size the header and body apart. */
export function dataFixTableScrollX(
  columns: ReadonlyArray<{ name: string; typeName: string }>,
): number {
  return columns.reduce((sum, column) => sum + dataFixColumnWidth(column.name, column.typeName), 0);
}
