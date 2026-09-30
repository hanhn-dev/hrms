import type { DatabaseObjectKind } from '../types.js';

type SqlServerObjectType = 'U' | 'V' | 'P' | 'FN' | 'IF' | 'TF' | 'SO' | 'TR';

const SQL_SERVER_OBJECT_TYPES = new Map<SqlServerObjectType, DatabaseObjectKind>([
  ['U', 'table'],
  ['V', 'view'],
  ['P', 'storedProcedure'],
  ['FN', 'function'],
  ['IF', 'function'],
  ['TF', 'function'],
  ['SO', 'sequence'],
  ['TR', 'trigger'],
]);

/**
 * Maps `sys.objects.type` (`char(2)`) to a catalog kind.
 * Single-letter types arrive space-padded (`'U '`, `'V '`, `'P '`) from the driver.
 */
export function mapSqlServerObjectType(
  type: string | null | undefined,
): DatabaseObjectKind | undefined {
  if (type == null) {
    return undefined;
  }
  const normalized = type.trim() as SqlServerObjectType;
  return SQL_SERVER_OBJECT_TYPES.get(normalized);
}
