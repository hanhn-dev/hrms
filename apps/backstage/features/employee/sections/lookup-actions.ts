"use server";

import { getSectionLookupRow, type SectionLookupDetail } from "@hrms/db";
import { z } from "zod";
import { requireRootAdmin } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

const inputSchema = z.object({
  lookupKey: z.string().min(1).max(64),
  id: z.number().int().positive(),
});

export async function loadSectionLookupRow(
  lookupKey: string,
  id: number,
): Promise<SectionLookupDetail> {
  await requireRootAdmin();
  const parsed = inputSchema.parse({ lookupKey, id });
  return getSectionLookupRow(await getHrmsDb(), parsed.lookupKey, parsed.id);
}
