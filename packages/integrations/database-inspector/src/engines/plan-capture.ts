import { quoteSqlIdentifier } from '../payload-to-parameters.js';

export const PLAN_RETURN_COLUMN = '__hrms_rc';

type PlanParameter = {
  readonly name: string;
  readonly dataType: string;
  readonly mode: 'in' | 'out' | 'inout';
};

export function buildPlanCaptureBatch(
  schema: string,
  name: string,
  parameters: readonly PlanParameter[],
  boundNames: ReadonlySet<string>,
): string {
  const procedure = `${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(name)}`;
  const lines = ['SET STATISTICS XML ON;', 'DECLARE @__hrms_rc int;'];
  const args: string[] = [];
  const selected = [`@__hrms_rc AS ${PLAN_RETURN_COLUMN}`];

  for (const parameter of parameters) {
    const parameterName = parameter.name.startsWith('@') ? parameter.name : `@${parameter.name}`;
    const bareName = parameterName.slice(1);
    const isOutput = parameter.mode === 'out' || parameter.mode === 'inout';
    const isBound = boundNames.has(bareName.toLowerCase());
    if (!isOutput && !isBound) {
      continue;
    }

    if (isOutput) {
      const local = `@__hrms_out_${bareName}`;
      const initial = isBound ? ` = ${parameterName}` : '';
      lines.push(`DECLARE ${local} ${parameter.dataType}${initial};`);
      args.push(`${parameterName} = ${local} OUTPUT`);
      selected.push(`${local} AS ${quoteSqlIdentifier(bareName)}`);
      continue;
    }

    args.push(`${parameterName} = ${parameterName}`);
  }

  lines.push(
    args.length === 0
      ? `EXEC @__hrms_rc = ${procedure};`
      : `EXEC @__hrms_rc = ${procedure} ${args.join(', ')};`,
  );
  lines.push(`SELECT ${selected.join(', ')};`);
  return lines.join('\n');
}

export function extractPlanCaptureRow(recordsets: Record<string, unknown>[][]): {
  recordsets: Record<string, unknown>[][];
  returnValue: unknown;
  output: Record<string, unknown>;
} {
  const data: Record<string, unknown>[][] = [];
  let returnValue: unknown = null;
  let output: Record<string, unknown> = {};

  for (const set of recordsets) {
    const row = set.length === 1 ? set[0] : undefined;
    if (!row || !Object.prototype.hasOwnProperty.call(row, PLAN_RETURN_COLUMN)) {
      data.push(set);
      continue;
    }

    const rest = { ...row };
    returnValue = rest[PLAN_RETURN_COLUMN];
    delete rest[PLAN_RETURN_COLUMN];
    output = rest;
  }

  return { recordsets: data, returnValue, output };
}
