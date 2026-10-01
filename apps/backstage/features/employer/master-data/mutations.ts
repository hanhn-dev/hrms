"use server";

import { commitMasterDataWrite, previewMasterDataWrite, requireMasterDataEntry } from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";
import { loadMasterData } from "@/features/employer/master-data/queries";
import {
  parseMasterDataWriteInput,
  masterDataWriteTokenSchema,
  type MasterDataWriteInput,
} from "@/features/employer/master-data/write-input";

const NOTE =
  "Writes the allowlisted columns on this master table for the selected employer. Delete removes the row. A value that is still in use will fail at commit.";

async function currentRow(input: MasterDataWriteInput) {
  if (input.mode === "insert") {
    return null;
  }
  const page = await loadMasterData(input.employerId, input.key);
  const selected = page.selected;
  if (!selected) {
    throw new Error(`${requireMasterDataEntry(input.key).label} is not in this database.`);
  }
  const id = input.id;
  return page.rows.find((row) => row[selected.idColumn] === id) ?? null;
}

export async function previewMasterDataChange(input: unknown): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = parseMasterDataWriteInput(input);
  const entry = requireMasterDataEntry(parsed.key);
  const current = await currentRow(parsed);
  const { preview } = previewMasterDataWrite({
    entry,
    mode: parsed.mode,
    current,
    values: parsed.values,
  });
  return {
    token: createConfirmToken({
      action: "master-data-write",
      env,
      employerId: parsed.employerId,
      key: parsed.key,
      mode: parsed.mode,
      id: parsed.id,
      values: parsed.values,
    }),
    preview,
    note: NOTE,
  };
}

export async function commitMasterDataChange(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, masterDataWriteTokenSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const entry = requireMasterDataEntry(payload.key);
  const current = await currentRow(payload);
  const { preview } = previewMasterDataWrite({
    entry,
    mode: payload.mode,
    current,
    values: payload.values,
  });
  await commitMasterDataWrite(await getHrmsDb(), {
    employerId: payload.employerId,
    key: payload.key,
    mode: payload.mode,
    id: payload.id,
    values: payload.values,
    userId: getAuditUserId(),
  });
  return { after: preview, note: NOTE };
}
