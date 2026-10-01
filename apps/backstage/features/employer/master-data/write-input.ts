import { z } from "zod";

export const masterDataWriteModes = ["insert", "update", "delete"] as const;

export type MasterDataWriteMode = (typeof masterDataWriteModes)[number];

const valueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const masterDataWriteInputSchema = z.object({
  employerId: z.number().int().positive(),
  key: z.string().trim().min(1),
  mode: z.enum(masterDataWriteModes),
  id: z.number().int().positive().nullable(),
  values: z.record(z.string(), valueSchema),
});

export const masterDataWriteTokenSchema = masterDataWriteInputSchema.extend({
  action: z.literal("master-data-write"),
  env: z.string().min(1),
});

export type MasterDataWriteInput = z.infer<typeof masterDataWriteInputSchema>;

export function parseMasterDataWriteInput(input: unknown): MasterDataWriteInput {
  return masterDataWriteInputSchema.parse(input);
}
