import { describe, expect, it } from 'vitest';

import { splitShowplanRecordsets } from '../engines/showplan-recordsets.js';

const SHOWPLAN_COLUMN = 'Microsoft SQL Server 2005 XML Showplan';

describe('splitShowplanRecordsets', () => {
  it('peels showplan recordsets out of the procedure results', () => {
    const split = splitShowplanRecordsets([
      [{ EmployeeId: 1 }],
      [{ [SHOWPLAN_COLUMN]: '<ShowPlanXML />' }],
      [{ [SHOWPLAN_COLUMN]: '<ShowPlanXML id="2" />' }, { [SHOWPLAN_COLUMN]: '  ' }],
    ]);

    expect(split.recordsets).toEqual([[{ EmployeeId: 1 }]]);
    expect(split.executionPlans).toEqual(['<ShowPlanXML />', '<ShowPlanXML id="2" />']);
  });

  it('reads the XML column id that node-mssql uses for showplan documents', () => {
    const split = splitShowplanRecordsets([
      [{ EmployeeId: 1 }],
      [{ 'XML_F52E2B61-18A1-11d1-B105-00805F49916B': '<ShowPlanXML />' }],
    ]);

    expect(split.recordsets).toEqual([[{ EmployeeId: 1 }]]);
    expect(split.executionPlans).toEqual(['<ShowPlanXML />']);
  });

  it('leaves a single XML cell that is not a showplan', () => {
    const rows = [{ 'XML_F52E2B61-18A1-11d1-B105-00805F49916B': '<Employee />' }];
    const split = splitShowplanRecordsets([rows]);

    expect(split.recordsets).toEqual([rows]);
    expect(split.executionPlans).toEqual([]);
  });

  it('leaves ordinary recordsets in place', () => {
    const rows = [{ Name: 'Ada' }];
    const split = splitShowplanRecordsets([rows, []]);

    expect(split.recordsets).toEqual([rows, []]);
    expect(split.executionPlans).toEqual([]);
  });

  it('keeps a row that only shares the showplan column with other fields', () => {
    const rows = [{ [SHOWPLAN_COLUMN]: '<ShowPlanXML />', EmployeeId: 1 }];
    const split = splitShowplanRecordsets([rows]);

    expect(split.recordsets).toEqual([rows]);
    expect(split.executionPlans).toEqual([]);
  });

  it('returns no plans when the driver did not send recordsets', () => {
    expect(splitShowplanRecordsets(null)).toEqual({ recordsets: [], executionPlans: [] });
  });
});
