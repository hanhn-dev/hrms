import { describe, expect, it } from 'vitest';

import {
  assertSqlIdentifier,
  buildNamedExecSql,
  mapPayloadToProcedureParameters,
  parseProcedurePayload,
} from '../payload-to-parameters.js';
import type { ProcedureParameterDescriptor } from '../types.js';

function parameter(
  name: string,
  systemType: string,
  options: Partial<ProcedureParameterDescriptor> = {},
): ProcedureParameterDescriptor {
  return {
    name,
    dataType: options.dataType ?? systemType,
    systemType,
    mode: options.mode ?? 'in',
    isTableType: options.isTableType ?? false,
  };
}

describe('parseProcedurePayload', () => {
  it('returns an object payload unchanged', () => {
    expect(parseProcedurePayload({ LoginId: 1 })).toEqual({ LoginId: 1 });
  });

  it('parses a JSON object string', () => {
    expect(parseProcedurePayload('{"LoginId":1}')).toEqual({ LoginId: 1 });
  });

  it('rejects invalid JSON strings', () => {
    expect(() => parseProcedurePayload('{')).toThrow('Payload string is not valid JSON.');
  });

  it('rejects JSON that is not an object', () => {
    expect(() => parseProcedurePayload('[1]')).toThrow('Payload JSON must parse to an object.');
    expect(() => parseProcedurePayload(['x'])).toThrow('Payload must be a JSON object or a JSON object string.');
  });
});

describe('mapPayloadToProcedureParameters', () => {
  const myDetailsParameters = [
    parameter('@LoginId', 'int'),
    parameter('@SectionID', 'int'),
    parameter('@EmployeeData', 'varchar', { dataType: 'varchar(max)' }),
    parameter('@FieldList', 'varchar', { dataType: 'varchar(max)' }),
  ];

  it('matches camelCase and @-prefixed keys onto SQL parameter names', () => {
    const mapped = mapPayloadToProcedureParameters(myDetailsParameters, {
      loginId: 1431,
      '@SectionID': 1,
      EmployeeData: '[]',
      fieldList: 'Work Email',
    });

    expect(mapped.ok).toBe(true);
    expect(mapped.boundParameters.map((item) => ({ name: item.name, sourceKey: item.sourceKey, value: item.value }))).toEqual([
      { name: '@LoginId', sourceKey: 'loginId', value: 1431 },
      { name: '@SectionID', sourceKey: '@SectionID', value: 1 },
      { name: '@EmployeeData', sourceKey: 'EmployeeData', value: '[]' },
      { name: '@FieldList', sourceKey: 'fieldList', value: 'Work Email' },
    ]);
    expect(mapped.unmatchedPayloadKeys).toEqual([]);
    expect(mapped.omittedParameters).toEqual([]);
  });

  it('stringifies nested objects and arrays for string-like parameters', () => {
    const mapped = mapPayloadToProcedureParameters(myDetailsParameters, {
      LoginId: 1431,
      SectionID: 1,
      EmployeeData: [{ ID: '1431', Action: 'Update' }],
      FieldList: 'Work Email',
    });

    expect(mapped.ok).toBe(true);
    expect(mapped.boundParameters.find((item) => item.name === '@EmployeeData')?.value).toBe(
      JSON.stringify([{ ID: '1431', Action: 'Update' }]),
    );
  });

  it('does not double-stringify JSON that is already a string', () => {
    const json = JSON.stringify([{ ID: '1431' }]);
    const mapped = mapPayloadToProcedureParameters(myDetailsParameters, {
      LoginId: 1431,
      SectionID: 1,
      EmployeeData: json,
      FieldList: 'Work Email',
    });

    expect(mapped.boundParameters.find((item) => item.name === '@EmployeeData')?.value).toBe(json);
  });

  it('lists unmatched payload keys as warnings and omitted parameters without failing', () => {
    const mapped = mapPayloadToProcedureParameters(myDetailsParameters, {
      LoginId: 1431,
      employerId: 9,
    });

    expect(mapped.ok).toBe(true);
    expect(mapped.unmatchedPayloadKeys).toEqual(['employerId']);
    expect(mapped.omittedParameters).toEqual(['@SectionID', '@EmployeeData', '@FieldList']);
    expect(mapped.warnings).toEqual(['Unmatched payload keys: employerId.']);
    expect(mapped.boundParameters).toHaveLength(1);
  });

  it('binds null as SQL NULL', () => {
    const mapped = mapPayloadToProcedureParameters([parameter('@Note', 'nvarchar')], { Note: null });

    expect(mapped.ok).toBe(true);
    expect(mapped.boundParameters[0]?.value).toBeNull();
  });

  it('rejects object values for non-string parameters', () => {
    const mapped = mapPayloadToProcedureParameters([parameter('@LoginId', 'int')], {
      LoginId: { nested: true },
    });

    expect(mapped.ok).toBe(false);
    expect(mapped.error).toContain('Cannot bind object/array payload key "LoginId" to @LoginId');
  });

  it('rejects table-valued parameters when a matching key is present', () => {
    const mapped = mapPayloadToProcedureParameters(
      [parameter('@Employees', 'UDT_Employee', { isTableType: true })],
      { Employees: [{ Id: 1 }] },
    );

    expect(mapped.ok).toBe(false);
    expect(mapped.error).toContain('Table-valued parameter @Employees');
  });

  it('rejects ambiguous payload keys that collapse to the same parameter', () => {
    const mapped = mapPayloadToProcedureParameters([parameter('@LoginId', 'int')], {
      LoginId: 1,
      loginId: 2,
    });

    expect(mapped.ok).toBe(false);
    expect(mapped.error).toContain('both map to the same parameter name');
  });

  it('coerces bit values from booleans, 0/1, and true/false strings', () => {
    const mapped = mapPayloadToProcedureParameters(
      [parameter('@IsActive', 'bit'), parameter('@IsValid', 'bit'), parameter('@Flag', 'bit')],
      { IsActive: true, IsValid: 'false', Flag: 1 },
    );

    expect(mapped.ok).toBe(true);
    expect(mapped.boundParameters.map((item) => item.value)).toEqual([true, false, true]);
  });

  it('coerces numeric strings for integer parameters', () => {
    const mapped = mapPayloadToProcedureParameters([parameter('@LoginId', 'int')], { LoginId: '1431' });

    expect(mapped.ok).toBe(true);
    expect(mapped.boundParameters[0]?.value).toBe(1431);
  });
});

describe('buildNamedExecSql', () => {
  it('builds a named EXEC statement from bound parameters', () => {
    const sql = buildNamedExecSql('dbo', 'Usp_Mydetails_Enhanced_Process_Template', [
      {
        name: '@LoginId',
        dataType: 'int',
        sourceKey: 'LoginId',
        value: 1431,
        mode: 'in',
      },
      {
        name: '@Result',
        dataType: 'int',
        sourceKey: 'Result',
        value: null,
        mode: 'out',
      },
    ]);

    expect(sql).toBe(
      'EXEC [dbo].[Usp_Mydetails_Enhanced_Process_Template] @LoginId = @LoginId, @Result = @Result OUTPUT',
    );
  });
});

describe('assertSqlIdentifier', () => {
  it('accepts conventional identifiers', () => {
    expect(() => assertSqlIdentifier('Usp_Mydetails_Enhanced_Process_Template', 'Procedure name')).not.toThrow();
  });

  it('rejects identifiers that could be used for SQL injection', () => {
    expect(() => assertSqlIdentifier('Foo; DROP TABLE T', 'Procedure name')).toThrow('is not a valid SQL identifier');
  });
});
