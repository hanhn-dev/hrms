"use server";

import { z } from "zod";
import {
  diffFieldRow,
  fieldRowPatchSchema,
  formatFieldRowReplaySql,
  formatValidationRuleReplaySql,
  getEmployerFieldRow,
  getEmployerFieldValidationPreview,
  getFieldTypeName,
  parseValidationRuleJson,
  updateEmployerFieldRow,
  updateEmployerFieldValidationRule,
  type FieldRowPatch,
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

const updateFieldRowPayloadSchema = z.object({
  action: z.literal("update-field-row"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  fieldId: z.number().int().positive(),
  fieldName: z.string().trim().min(1).max(255),
  displayText: z.string().trim().min(1).max(255),
  fieldEntity: z.string().trim().min(1).max(50),
  fieldTypeId: z.number().int().positive(),
  isMandatory: z.boolean(),
  isValidate: z.boolean(),
  isHidden: z.boolean(),
  isActive: z.boolean(),
});

export async function previewUpdateValidationRule(input: {
  employerId: number;
  fieldId: number;
  validationRule: string | null;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
  sql?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const parsed = parseValidationRuleJson(input.validationRule);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const current = await getEmployerFieldRow(await getHrmsDb(), {
    employerId: input.employerId,
    fieldId: input.fieldId,
  });
  if (!current) {
    throw new Error("Field was not found for this employer.");
  }
  const updatedBy = getAuditUserId();
  return {
    token: createConfirmToken({
      action: "update-validation-rule",
      env,
      employerId: input.employerId,
      fieldId: input.fieldId,
      validationRule: parsed.compact,
    }),
    preview: [
      {
        Property: "ValidationRule",
        Current: current.validationRule ?? "—",
        Proposed: parsed.compact ?? "—",
      },
    ],
    note: "Updates TEmployeeDetail_Fields.ValidationRule only. Writes a TEmployeeDetail_Fields_UpdateHistory snapshot first. Replay SQL matches by natural key, not FieldID.",
    sql: formatValidationRuleReplaySql({
      env,
      sourceFieldId: current.fieldId,
      current,
      validationRule: parsed.compact,
      updatedBy,
    }),
  };
}

export async function commitUpdateValidationRule(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string; sql?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, updateValidationRulePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const db = await getHrmsDb();
  const current = await getEmployerFieldRow(db, {
    employerId: payload.employerId,
    fieldId: payload.fieldId,
  });
  if (!current) {
    throw new Error("Field was not found for this employer.");
  }
  const updatedBy = getAuditUserId();
  const sql = formatValidationRuleReplaySql({
    env: payload.env,
    sourceFieldId: current.fieldId,
    current,
    validationRule: payload.validationRule,
    updatedBy,
  });
  await updateEmployerFieldValidationRule(db, {
    employerId: payload.employerId,
    fieldId: payload.fieldId,
    validationRule: payload.validationRule,
    updatedBy,
  });
  return {
    after: await getEmployerFieldValidationPreview(db, {
      employerId: payload.employerId,
      fieldId: payload.fieldId,
    }),
    note: "ValidationRule updated. Copy the replay SQL to apply the same change on another environment.",
    sql,
  };
}

export async function previewUpdateFieldRow(input: {
  employerId: number;
  fieldId: number;
  values: Record<string, unknown>;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
  sql?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const patch = patchFromValues(input.values);
  const db = await getHrmsDb();
  const current = await getEmployerFieldRow(db, {
    employerId: input.employerId,
    fieldId: input.fieldId,
  });
  if (!current) {
    throw new Error("Field was not found for this employer.");
  }
  if (asDefault(current.isDefault) && !patch.isMandatory) {
    throw new Error(
      "IsMandatory cannot be turned off for a System Mandatory field.",
    );
  }
  const proposedFieldType = await getFieldTypeName(db, patch.fieldTypeId);
  if (proposedFieldType == null) {
    throw new Error("FieldType was not found.");
  }
  const preview = diffFieldRow(current, patch, proposedFieldType);
  if (preview.length === 0) {
    throw new Error("No changes to save.");
  }
  const updatedBy = getAuditUserId();
  return {
    token: createConfirmToken({
      action: "update-field-row",
      env,
      employerId: input.employerId,
      fieldId: input.fieldId,
      ...patch,
    }),
    preview,
    note: "Updates TEmployeeDetail_Fields for this employer. Writes a history snapshot first. Replay SQL matches by natural key, not FieldID. FieldType_JSON_SQL is left unchanged.",
    sql: formatFieldRowReplaySql({
      env,
      sourceFieldId: current.fieldId,
      current,
      patch,
      updatedBy,
    }),
  };
}

export async function commitUpdateFieldRow(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string; sql?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, updateFieldRowPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const patch: FieldRowPatch = {
    fieldName: payload.fieldName,
    displayText: payload.displayText,
    fieldEntity: payload.fieldEntity,
    fieldTypeId: payload.fieldTypeId,
    isMandatory: payload.isMandatory,
    isValidate: payload.isValidate,
    isHidden: payload.isHidden,
    isActive: payload.isActive,
  };
  const db = await getHrmsDb();
  const current = await getEmployerFieldRow(db, {
    employerId: payload.employerId,
    fieldId: payload.fieldId,
  });
  if (!current) {
    throw new Error("Field was not found for this employer.");
  }
  const updatedBy = getAuditUserId();
  const proposedFieldType = await getFieldTypeName(db, patch.fieldTypeId);
  const sql = formatFieldRowReplaySql({
    env: payload.env,
    sourceFieldId: current.fieldId,
    current,
    patch,
    updatedBy,
  });
  await updateEmployerFieldRow(db, {
    employerId: payload.employerId,
    fieldId: payload.fieldId,
    patch,
    updatedBy,
  });
  const afterRow = await getEmployerFieldRow(db, {
    employerId: payload.employerId,
    fieldId: payload.fieldId,
  });
  return {
    after: afterRow
      ? diffFieldRow(
          current,
          patch,
          proposedFieldType ?? afterRow.fieldType,
        )
      : [],
    note: "Field updated. Copy the replay SQL to apply the same change on another environment.",
    sql,
  };
}

function patchFromValues(values: Record<string, unknown>): FieldRowPatch {
  const result = fieldRowPatchSchema.safeParse({
    fieldName: values.fieldName,
    displayText: values.displayText,
    fieldEntity: values.fieldEntity,
    fieldTypeId: Number(values.fieldTypeId),
    isMandatory: asBool(values.isMandatory),
    isValidate: asBool(values.isValidate),
    isHidden: asBool(values.isHidden),
    isActive: asBool(values.isActive),
  });
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid field values.");
  }
  return result.data;
}

function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "Y";
}

function asDefault(value: unknown): boolean {
  return asBool(value);
}
