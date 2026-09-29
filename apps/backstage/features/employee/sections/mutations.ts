"use server";

import { z } from "zod";
import {
  checkExistInDatabase,
  checkUniqueInDatabase,
  commitDeleteSectionRecord,
  commitUpsertSectionRecord,
  listSectionFormFields,
  loadSectionRecordValues,
  previewSectionUpsertDiff,
  sectionTableSupportsDelete,
} from "@hrms/db";
import {
  assertWritesEnabled,
  createConfirmToken,
  getAuditUserId,
  requireRootAdmin,
  verifyConfirmToken,
} from "@/shared/auth";
import { assertSameEnvironment, getHrmsDb, getSelectedEnvironment } from "@/shared/db";
import {
  buildValidationRule,
  validateRow,
  type SectionFieldDef,
} from "@/features/employee/sections/validation";

const valuesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const upsertPayloadSchema = z.object({
  action: z.literal("upsert-section-record"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  employmentNumber: z.string().min(1),
  sectionId: z.number().int().positive(),
  liveTable: z.string().min(1).max(128),
  entityKey: z.number().int().positive().nullable(),
  values: valuesSchema,
});

const deletePayloadSchema = z.object({
  action: z.literal("delete-section-record"),
  env: z.string().min(1),
  employerId: z.number().int().positive(),
  employmentNumber: z.string().min(1),
  sectionId: z.number().int().positive(),
  liveTable: z.string().min(1).max(128),
  entityKey: z.number().int().positive(),
});

function toFieldDefs(
  fields: Array<{
    displayText: string;
    isMandatory: boolean;
    validationRule: string | null;
    fieldType: string | null;
  }>,
): SectionFieldDef[] {
  return fields.map((f) => ({
    displayText: f.displayText,
    isMandatory: f.isMandatory,
    validationRule: f.validationRule,
    fieldType: f.fieldType,
  }));
}

async function assertClientAndDbRules(input: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  values: Record<string, string | number | boolean | null>;
  entityKey: number | null;
}): Promise<{ skippedRules: string[] }> {
  const db = await getHrmsDb();
  const fields = await listSectionFormFields(db, {
    employerId: input.employerId,
    employmentNumber: input.employmentNumber,
    sectionId: input.sectionId,
  });
  const fieldDefs = toFieldDefs(fields);
  const client = validateRow(input.values, fieldDefs);
  if (!client.isValid) {
    const first = client.errorFields[0];
    throw new Error(
      first
        ? `${first.fieldName}: ${first.errors.join("; ")}`
        : "Validation failed.",
    );
  }

  for (const field of fields) {
    const built = buildValidationRule({
      displayText: field.displayText,
      isMandatory: field.isMandatory,
      validationRule: field.validationRule,
    });
    const value = input.values[field.displayText] ?? null;
    for (const entry of built.rules) {
      if (entry.rule === "existInDatabase") {
        const params = (entry.params ?? {}) as {
          table?: string;
          column?: string;
          ActiveOnly?: boolean;
        };
        if (!params.table || !params.column) continue;
        const check = await checkExistInDatabase(db, {
          table: params.table,
          column: params.column,
          value,
          activeOnly: params.ActiveOnly === true,
          errorMessage: entry.errorMessage,
        });
        if (!check.ok) {
          throw new Error(`${field.displayText}: ${check.message}`);
        }
      }
      if (entry.rule === "uniqueInDatabase") {
        const params = (entry.params ?? {}) as {
          table?: string;
          column?: string;
          excludeColumn?: string;
          excludeValueField?: string;
        };
        if (!params.table || !params.column) continue;
        const excludeValue =
          params.excludeColumn && input.entityKey != null
            ? input.entityKey
            : null;
        const check = await checkUniqueInDatabase(db, {
          table: params.table,
          column: params.column,
          value,
          excludeColumn: params.excludeColumn,
          excludeValue,
          errorMessage: entry.errorMessage,
        });
        if (!check.ok) {
          throw new Error(`${field.displayText}: ${check.message}`);
        }
      }
    }
  }

  return { skippedRules: client.skippedRules };
}

export async function previewUpsertSectionRecord(input: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  liveTable: string;
  entityKey: number | null;
  values: Record<string, string | number | boolean | null>;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  const db = await getHrmsDb();
  const { skippedRules } = await assertClientAndDbRules(input);

  const fields = await listSectionFormFields(db, {
    employerId: input.employerId,
    employmentNumber: input.employmentNumber,
    sectionId: input.sectionId,
  });
  const before =
    input.entityKey != null
      ? await loadSectionRecordValues(db, {
          employerId: input.employerId,
          employmentNumber: input.employmentNumber,
          sectionId: input.sectionId,
          liveTable: input.liveTable,
          entityKey: input.entityKey,
        })
      : null;

  const preview = previewSectionUpsertDiff({
    liveTable: input.liveTable,
    entityKey: input.entityKey,
    before,
    after: input.values,
    fields,
  });

  const notes = [
    "Writes live table columns only (no My Details SPs/views/functions; no history table insert).",
  ];
  if (skippedRules.length > 0) {
    notes.push(
      `Skipped contextual rules (not fully enforced): ${skippedRules.join(", ")}.`,
    );
  }

  return {
    token: createConfirmToken({
      action: "upsert-section-record",
      env,
      employerId: input.employerId,
      employmentNumber: input.employmentNumber,
      sectionId: input.sectionId,
      liveTable: input.liveTable,
      entityKey: input.entityKey,
      values: input.values,
    }),
    preview,
    note: notes.join(" "),
  };
}

export async function commitUpsertSectionRecordAction(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, upsertPayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  await assertClientAndDbRules({
    employerId: payload.employerId,
    employmentNumber: payload.employmentNumber,
    sectionId: payload.sectionId,
    values: payload.values,
    entityKey: payload.entityKey,
  });
  const result = await commitUpsertSectionRecord(await getHrmsDb(), {
    employerId: payload.employerId,
    employmentNumber: payload.employmentNumber,
    sectionId: payload.sectionId,
    liveTable: payload.liveTable,
    entityKey: payload.entityKey,
    values: payload.values,
    updatedBy: getAuditUserId(),
  });
  return {
    after: [
      {
        LiveTable: result.liveTable,
        EntityKey: result.entityKey,
        Status: "Saved",
      },
    ],
    note: "Record saved on the live table.",
  };
}

export async function previewDeleteSectionRecord(input: {
  employerId: number;
  employmentNumber: string;
  sectionId: number;
  liveTable: string;
  entityKey: number;
}): Promise<{
  token: string;
  preview: Array<Record<string, unknown>>;
  note?: string;
}> {
  await requireRootAdmin();
  const env = await getSelectedEnvironment();
  assertWritesEnabled(env);
  if (!sectionTableSupportsDelete(input.sectionId, input.liveTable)) {
    throw new Error(
      `Delete is not supported for ${input.liveTable} (no soft-delete column).`,
    );
  }
  const before = await loadSectionRecordValues(await getHrmsDb(), input);
  if (!before) {
    throw new Error("Record was not found or is already inactive.");
  }
  return {
    token: createConfirmToken({
      action: "delete-section-record",
      env,
      employerId: input.employerId,
      employmentNumber: input.employmentNumber,
      sectionId: input.sectionId,
      liveTable: input.liveTable,
      entityKey: input.entityKey,
    }),
    preview: [
      {
        Property: "Action",
        Current: "Active",
        Proposed: "Soft-delete",
      },
      {
        Property: "Table",
        Current: input.liveTable,
        Proposed: input.liveTable,
      },
      {
        Property: "EntityKey",
        Current: input.entityKey,
        Proposed: input.entityKey,
      },
    ],
    note: "Soft-deletes the live row only. Does not write history tables or call My Details SPs.",
  };
}

export async function commitDeleteSectionRecordAction(
  token: string,
): Promise<{ after: Array<Record<string, unknown>>; note?: string }> {
  await requireRootAdmin();
  const payload = verifyConfirmToken(token, deletePayloadSchema);
  await assertSameEnvironment(payload.env);
  assertWritesEnabled(payload.env);
  const result = await commitDeleteSectionRecord(await getHrmsDb(), {
    employerId: payload.employerId,
    employmentNumber: payload.employmentNumber,
    sectionId: payload.sectionId,
    liveTable: payload.liveTable,
    entityKey: payload.entityKey,
    updatedBy: getAuditUserId(),
  });
  return {
    after: [
      {
        LiveTable: result.liveTable,
        EntityKey: result.entityKey,
        Status: "Soft-deleted",
      },
    ],
    note: "Record soft-deleted on the live table.",
  };
}
