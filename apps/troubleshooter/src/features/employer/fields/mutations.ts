"use server";

import { z } from "zod";
import {
  getEmployerFieldValidationPreview,
  parseValidationRuleJson,
  updateEmployerFieldValidationRule,
} from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";

const updateValidationRulePayloadSchema = z.object({
  action: z.literal("update-validation-rule"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  fieldId: z.number().int().positive(),
  validationRule: z.string().max(1000).nullable(),
});

export async function previewUpdateValidationRule(input: {
  employerId: number;
  fieldId: number;
  validationRule: string | null;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = parseValidationRuleJson(input.validationRule);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const preview = await getEmployerFieldValidationPreview(await getHrmsDb(), {
    employerId: input.employerId,
    fieldId: input.fieldId,
  });
  if (preview.length === 0) {
    throw new Error("Field was not found for this employer.");
  }
  return {
    token: createConfirmToken({
      action: "update-validation-rule",
      env,
      employerId: input.employerId,
      fieldId: input.fieldId,
      validationRule: parsed.compact,
    }),
    preview: preview.map((row) => ({
      ...row,
      ProposedValidationRule: parsed.compact,
    })),
    note: "Updates TEmployeeDetail_Fields.ValidationRule only. Writes a TEmployeeDetail_Fields_UpdateHistory snapshot first.",
  };
}

export async function commitUpdateValidationRule(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, updateValidationRulePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await updateEmployerFieldValidationRule(await getHrmsDb(), {
    employerId: payload.employerId,
    fieldId: payload.fieldId,
    validationRule: payload.validationRule,
    updatedBy: getAuditUserId(),
  });
  return {
    after: await getEmployerFieldValidationPreview(await getHrmsDb(), {
      employerId: payload.employerId,
      fieldId: payload.fieldId,
    }),
    note: "ValidationRule updated.",
  };
}
