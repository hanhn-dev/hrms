/** Case-insensitive `table.column` key for dbo presence checks. */
export function columnPresenceKey(table: string, column: string): string {
  return `${table.toLowerCase()}.${column.toLowerCase()}`;
}
