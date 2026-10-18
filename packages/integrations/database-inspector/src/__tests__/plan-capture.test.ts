import { describe, expect, it } from 'vitest';

import { buildPlanCaptureBatch, extractPlanCaptureRow } from '../engines/plan-capture.js';

describe('buildPlanCaptureBatch', () => {
  it('captures the return value of a procedure with no arguments', () => {
    expect(buildPlanCaptureBatch('mon', 'usp_GetOverview', [], new Set())).toBe(
      [
        'SET STATISTICS XML ON;',
        'DECLARE @__hrms_rc int;',
        'EXEC @__hrms_rc = [mon].[usp_GetOverview];',
        'SELECT @__hrms_rc AS __hrms_rc;',
      ].join('\n'),
    );
  });

  it('passes bound inputs and reads output parameters back', () => {
    const batch = buildPlanCaptureBatch(
      'dbo',
      'SaveRow',
      [
        { name: '@Id', dataType: 'int', mode: 'in' },
        { name: '@Note', dataType: 'nvarchar(100)', mode: 'out' },
        { name: '@Optional', dataType: 'int', mode: 'in' },
      ],
      new Set(['id', 'note']),
    );

    expect(batch).toContain('DECLARE @__hrms_out_Note nvarchar(100) = @Note;');
    expect(batch).toContain('EXEC @__hrms_rc = [dbo].[SaveRow] @Id = @Id, @Note = @__hrms_out_Note OUTPUT;');
    expect(batch).toContain('[Note]');
    expect(batch).not.toContain('@Optional');
  });
});

describe('extractPlanCaptureRow', () => {
  it('removes the return row from the procedure results', () => {
    const extracted = extractPlanCaptureRow([
      [{ EmployeeId: 1 }],
      [{ __hrms_rc: 0, Note: 'saved' }],
    ]);

    expect(extracted.recordsets).toEqual([[{ EmployeeId: 1 }]]);
    expect(extracted.returnValue).toBe(0);
    expect(extracted.output).toEqual({ Note: 'saved' });
  });
});
