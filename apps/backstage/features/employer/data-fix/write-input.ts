import { z } from "zod";

const optionalText = z.string().trim().min(1).nullable();

export const dataFixWriteInputSchema = z.object({
  employerId: z.number().int().positive(),
  schema: z.string().trim().min(1),
  table: z.string().trim().min(1),
  column: z.string().trim().min(1),
  matchNull: z.boolean(),
  matchText: optionalText,
  setNull: z.boolean(),
  newText: optionalText,
  employmentNumber: optionalText,
});

export const dataFixWriteTokenSchema = dataFixWriteInputSchema.extend({
  action: z.literal("data-fix-write"),
  env: z.string().min(1),
  expectedCount: z.number().int().positive().max(200),
});

export type DataFixWriteInput = z.infer<typeof dataFixWriteInputSchema>;

export function parseDataFixWriteInput(input: unknown): DataFixWriteInput {
  return dataFixWriteInputSchema.parse(input);
}

const cellText = z.string().nullable();

export const dataFixBatchInputSchema = z.object({
  employerId: z.number().int().positive(),
  schema: z.string().trim().min(1),
  table: z.string().trim().min(1),
  changes: z
    .array(
      z.object({
        keys: z.record(z.string(), cellText),
        column: z.string().trim().min(1),
        previous: cellText,
        next: cellText,
      }),
    )
    .min(1)
    .max(200),
});

export const dataFixBatchTokenSchema = dataFixBatchInputSchema.extend({
  action: z.literal("data-fix-batch"),
  env: z.string().min(1),
});

export type DataFixBatchInput = z.infer<typeof dataFixBatchInputSchema>;

export function parseDataFixBatchInput(input: unknown): DataFixBatchInput {
  return dataFixBatchInputSchema.parse(input);
}
