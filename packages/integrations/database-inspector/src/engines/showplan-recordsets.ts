const SHOWPLAN_COLUMN = 'microsoft sql server 2005 xml showplan';
/** node-mssql names a single XML column with this id and puts the document in the cell. */
const XML_COLUMN = 'xml_f52e2b61-18a1-11d1-b105-00805f49916b';

export function splitShowplanRecordsets(recordsets: unknown): {
  recordsets: Record<string, unknown>[][];
  executionPlans: string[];
} {
  const sets = Array.isArray(recordsets) ? recordsets : [];
  const data: Record<string, unknown>[][] = [];
  const executionPlans: string[] = [];

  for (const set of sets) {
    if (!Array.isArray(set)) {
      data.push([]);
      continue;
    }

    const plans = showplanRows(set);
    if (plans) {
      executionPlans.push(...plans);
      continue;
    }

    data.push(set as Record<string, unknown>[]);
  }

  return { recordsets: data, executionPlans };
}

function showplanRows(rows: unknown[]): string[] | null {
  if (rows.length === 0) {
    return null;
  }

  const plans: string[] = [];
  for (const row of rows) {
    const xml = showplanXml(row);
    if (xml == null) {
      return null;
    }
    if (xml.trim() !== '') {
      plans.push(xml);
    }
  }

  return plans;
}

function showplanXml(row: unknown): string | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null;
  }

  const record = row as Record<string, unknown>;
  const keys = Object.keys(record);
  const key = keys[0]?.toLowerCase();
  if (keys.length !== 1 || (key !== SHOWPLAN_COLUMN && key !== XML_COLUMN)) {
    return null;
  }

  const value = record[keys[0]!];
  if (typeof value !== 'string') {
    return null;
  }
  if (key === XML_COLUMN && !value.includes('<ShowPlanXML')) {
    return null;
  }
  return value;
}
