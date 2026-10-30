"use server";

import { z } from "zod";
import {
  captureQueryScript,
  employerFieldPageForFocus,
  listEmployerFieldSections,
  listEmployerFields,
  listFieldTemplate,
  listFieldTemplateSections,
  listPublicEmployerFields,
  listPublicFieldSections,
  publicFieldPageForFocus,
  templateFieldPageForFocus,
  type FieldCatalogRow,
  type FieldSectionSummary,
  type PublicFieldRow,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

const entitiesSchema = z.array(z.string().max(50)).max(20);

const summarySchema = z.object({
  q: z.string().max(200).nullable().optional(),
  section: z.string().max(200).nullable().optional(),
  entities: entitiesSchema,
});

const employerSummarySchema = summarySchema.extend({
  employerId: z.number().int().positive(),
});

const pageSchema = summarySchema.extend({
  section: z.string().trim().min(1).max(200),
  page: z.number().int().positive().max(10_000).nullable().optional(),
  pageSize: z.number().int().positive().max(10_000).nullable().optional(),
  focusField: z.string().max(255).nullable().optional(),
});

const employerPageSchema = pageSchema.extend({
  employerId: z.number().int().positive(),
});

const publicSummarySchema = z.object({
  employerId: z.number().int().positive(),
  q: z.string().max(200).nullable().optional(),
  section: z.string().max(200).nullable().optional(),
});

const publicPageSchema = publicSummarySchema.extend({
  section: z.string().trim().min(1).max(200),
  page: z.number().int().positive().max(10_000).nullable().optional(),
  pageSize: z.number().int().positive().max(10_000).nullable().optional(),
  focusField: z.string().max(255).nullable().optional(),
});

export type CatalogSectionPage = {
  rows: FieldCatalogRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  script: string;
};

export type PublicSectionPage = {
  rows: PublicFieldRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  script: string;
};

export async function loadEmployerFieldSections(input: {
  employerId: number;
  q?: string | null;
  section?: string | null;
  entities: string[];
}): Promise<FieldSectionSummary[]> {
  await requireFeature("employers");
  const parsed = employerSummarySchema.parse(input);
  return listEmployerFieldSections(await getHrmsDb(), parsed.employerId, {
    q: parsed.q,
    section: parsed.section,
    entities: parsed.entities,
  });
}

export async function loadTemplateFieldSections(input: {
  q?: string | null;
  section?: string | null;
  entities: string[];
}): Promise<FieldSectionSummary[]> {
  await requireFeature("employers");
  const parsed = summarySchema.parse(input);
  return listFieldTemplateSections(await getHrmsDb(), {
    q: parsed.q,
    section: parsed.section,
    entities: parsed.entities,
  });
}

export async function loadPublicFieldSections(input: {
  employerId: number;
  q?: string | null;
  section?: string | null;
}): Promise<FieldSectionSummary[]> {
  await requireFeature("employers");
  const parsed = publicSummarySchema.parse(input);
  return listPublicFieldSections(await getHrmsDb(), parsed.employerId, {
    q: parsed.q,
    section: parsed.section,
  });
}

export async function loadEmployerSectionFields(input: {
  employerId: number;
  section: string;
  q?: string | null;
  entities: string[];
  page?: number | null;
  pageSize?: number | null;
  focusField?: string | null;
}): Promise<CatalogSectionPage> {
  await requireFeature("employers");
  const parsed = employerPageSchema.parse(input);
  const db = await getHrmsDb();
  const filters = {
    q: parsed.q,
    section: parsed.section,
    entities: parsed.entities,
  };
  const page =
    parsed.page ??
    (await employerFieldPageForFocus(db, parsed.employerId, {
      ...filters,
      pageSize: parsed.pageSize,
      field: parsed.focusField,
    }));
  const captured = await captureQueryScript(() =>
    listEmployerFields(db, parsed.employerId, { ...filters, page, pageSize: parsed.pageSize }),
  );
  return { ...captured.result, script: captured.script };
}

export async function loadTemplateSectionFields(input: {
  section: string;
  q?: string | null;
  entities: string[];
  page?: number | null;
  pageSize?: number | null;
  focusField?: string | null;
}): Promise<CatalogSectionPage> {
  await requireFeature("employers");
  const parsed = pageSchema.parse(input);
  const db = await getHrmsDb();
  const filters = {
    q: parsed.q,
    section: parsed.section,
    entities: parsed.entities,
  };
  const page =
    parsed.page ??
    (await templateFieldPageForFocus(db, {
      ...filters,
      pageSize: parsed.pageSize,
      field: parsed.focusField,
    }));
  const captured = await captureQueryScript(() =>
    listFieldTemplate(db, { ...filters, page, pageSize: parsed.pageSize }),
  );
  return { ...captured.result, script: captured.script };
}

export async function loadPublicSectionFields(input: {
  employerId: number;
  section: string;
  q?: string | null;
  page?: number | null;
  pageSize?: number | null;
  focusField?: string | null;
}): Promise<PublicSectionPage> {
  await requireFeature("employers");
  const parsed = publicPageSchema.parse(input);
  const db = await getHrmsDb();
  const filters = { q: parsed.q, section: parsed.section };
  const page =
    parsed.page ??
    (await publicFieldPageForFocus(db, parsed.employerId, {
      ...filters,
      pageSize: parsed.pageSize,
      field: parsed.focusField,
    }));
  const captured = await captureQueryScript(() =>
    listPublicEmployerFields(db, parsed.employerId, { ...filters, page, pageSize: parsed.pageSize }),
  );
  return { ...captured.result, script: captured.script };
}
