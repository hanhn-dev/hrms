"use server";

import { z } from "zod";
import {
  CUSTOMER_SETTING_CATEGORY_IDS,
  getCustomerSettings,
  previewCustomerSettingsPatch,
  updateCustomerSettingsCategory,
} from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";

const NOTE =
  "Updates TCustomerSettings (and T&E / payroll satellite rows when those fields change). Does not run HRMS.Web post-save side effects such as LMS global rating scale, MMT key copy, or travel-config copy-from-master.";

const patchValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const updatePayloadSchema = z.object({
  action: z.literal("update-customer-settings"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  category: z.enum(CUSTOMER_SETTING_CATEGORY_IDS),
  patch: z.record(z.string(), patchValueSchema),
});

const inputSchema = z.object({
  employerId: z.number().int().positive(),
  category: z.enum(CUSTOMER_SETTING_CATEGORY_IDS),
  patch: z.record(z.string(), patchValueSchema),
});

export async function previewUpdateCustomerSettings(input: {
  employerId: number;
  category: string;
  patch: Record<string, unknown>;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = inputSchema.parse(input);
  const current = await getCustomerSettings(await getHrmsDb(), parsed.employerId);
  if (!current) {
    throw new Error("Customer settings were not found for this employer.");
  }
  const { preview } = previewCustomerSettingsPatch(
    current,
    parsed.category,
    parsed.patch,
  );
  return {
    token: createConfirmToken({
      action: "update-customer-settings",
      env,
      employerId: parsed.employerId,
      category: parsed.category,
      patch: parsed.patch,
    }),
    preview,
    note: NOTE,
  };
}

export async function commitUpdateCustomerSettings(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, updatePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const db = await getHrmsDb();
  const current = await getCustomerSettings(db, payload.employerId);
  if (!current) {
    throw new Error("Customer settings were not found for this employer.");
  }
  const { preview } = previewCustomerSettingsPatch(
    current,
    payload.category,
    payload.patch,
  );
  await updateCustomerSettingsCategory(db, {
    employerId: payload.employerId,
    category: payload.category,
    patch: payload.patch,
    updatedBy: getAuditUserId(),
  });
  return {
    after: preview.map((row) => ({
      Key: row.Key,
      Label: row.Label,
      Value: row.Proposed,
    })),
    note: NOTE,
  };
}
