"use server";

import { commitDataFix, commitDataFixBatch, previewDataFix } from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";
import { dataFixNextLabel, dataFixPreviewRows } from "@/features/employer/data-fix/preview-rows";
import {
  dataFixBatchTokenSchema,
  dataFixWriteTokenSchema,
  parseDataFixBatchInput,
  parseDataFixWriteInput,
} from "@/features/employer/data-fix/write-input";

export async function previewDataFixChange(input: unknown): Promise<{
  token: string;
  preview: Array<Record<string, string>>;
  note: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = parseDataFixWriteInput(input);
  const preview = await previewDataFix(await getHrmsDb(), parsed);
  const rows = dataFixPreviewRows({
    column: preview.column,
    keyColumns: preview.keyColumns,
    sample: preview.sample,
    nextValue: dataFixNextLabel(parsed.setNull, parsed.newText ?? ""),
  });
  const shown = rows.length;
  const countLabel = preview.rowCount === 1 ? "1 row will change." : `${preview.rowCount} rows will change.`;
  const sampleLabel = preview.rowCount === shown ? "" : ` Showing ${shown}.`;
  return {
    token: createConfirmToken({
      action: "data-fix-write",
      env,
      ...parsed,
      expectedCount: preview.rowCount,
    }),
    preview: rows,
    note: `${countLabel}${sampleLabel} Confirm updates only this column for the rows that still match.`,
  };
}

export async function commitDataFixChange(token: string): Promise<{
  after: Array<Record<string, string>>;
  note: string;
}> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, dataFixWriteTokenSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const rowCount = await commitDataFix(
    await getHrmsDb(),
    payload,
    payload.expectedCount,
  );
  const countLabel = rowCount === 1 ? "1 row updated." : `${rowCount} rows updated.`;
  return {
    after: [
      {
        Rows: String(rowCount),
        Column: `${payload.schema}.${payload.table}.${payload.column}`,
      },
    ],
    note: countLabel,
  };
}

export async function previewDataFixBatch(input: unknown): Promise<{
  token: string;
  preview: Array<Record<string, string>>;
  note: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = parseDataFixBatchInput(input);
  const rows = parsed.changes.map((change) => ({
    Key: Object.entries(change.keys)
      .map(([name, value]) => `${name}=${value ?? "NULL"}`)
      .join(", "),
    Column: change.column,
    "Current value": change.previous ?? "NULL",
    "New value": change.next ?? "NULL",
  }));
  const countLabel = parsed.changes.length === 1 ? "1 cell will change." : `${parsed.changes.length} cells will change.`;
  return {
    token: createConfirmToken({
      action: "data-fix-batch",
      env,
      ...parsed,
    }),
    preview: rows,
    note: `${countLabel} Confirm writes every cell in one transaction.`,
  };
}

export async function commitDataFixBatchChange(token: string): Promise<{
  after: Array<Record<string, string>>;
  note: string;
}> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, dataFixBatchTokenSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const cellCount = await commitDataFixBatch(await getHrmsDb(), payload);
  const countLabel = cellCount === 1 ? "1 cell updated." : `${cellCount} cells updated.`;
  return {
    after: [
      {
        Cells: String(cellCount),
        Table: `${payload.schema}.${payload.table}`,
      },
    ],
    note: countLabel,
  };
}
