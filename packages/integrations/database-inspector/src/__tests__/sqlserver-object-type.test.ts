import { describe, expect, it } from 'vitest';

import { mapSqlServerObjectType } from '../engines/sqlserver-object-type.js';

describe('mapSqlServerObjectType', () => {
  it('maps space-padded single-letter sys.objects.type values', () => {
    expect(mapSqlServerObjectType('U ')).toBe('table');
    expect(mapSqlServerObjectType('V ')).toBe('view');
    expect(mapSqlServerObjectType('P ')).toBe('storedProcedure');
  });

  it('maps exact single-letter and two-letter types', () => {
    expect(mapSqlServerObjectType('U')).toBe('table');
    expect(mapSqlServerObjectType('V')).toBe('view');
    expect(mapSqlServerObjectType('P')).toBe('storedProcedure');
    expect(mapSqlServerObjectType('FN')).toBe('function');
    expect(mapSqlServerObjectType('IF')).toBe('function');
    expect(mapSqlServerObjectType('TF')).toBe('function');
    expect(mapSqlServerObjectType('SO')).toBe('sequence');
    expect(mapSqlServerObjectType('TR')).toBe('trigger');
  });

  it('returns undefined for unknown or empty types', () => {
    expect(mapSqlServerObjectType(null)).toBeUndefined();
    expect(mapSqlServerObjectType(undefined)).toBeUndefined();
    expect(mapSqlServerObjectType('')).toBeUndefined();
    expect(mapSqlServerObjectType('XX')).toBeUndefined();
  });
});
