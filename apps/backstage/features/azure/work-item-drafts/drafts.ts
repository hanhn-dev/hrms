import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";

export const DRAFTS_DIR_NAME = "_work-item-drafts";

export const DEFAULT_DRAFTS_DIR = path.join(
  process.cwd(),
  "content",
  "azure",
  DRAFTS_DIR_NAME,
);

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const WorkItemDraftStatusSchema = z.enum(["pending", "published", "rejected"]);
export type WorkItemDraftStatus = z.infer<typeof WorkItemDraftStatusSchema>;

export const WorkItemDraftObjectTypeSchema = z.enum(["procedure", "view", "function"]);
export type WorkItemDraftObjectType = z.infer<typeof WorkItemDraftObjectTypeSchema>;

export const WorkItemDraftSchema = z.object({
  id: z.string().uuid(),
  status: WorkItemDraftStatusSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  objectName: z.string().min(1),
  objectType: WorkItemDraftObjectTypeSchema,
  databaseSlug: z.string().min(1),
  sourcePath: z.string().min(1),
  title: z.string().min(1),
  type: z.literal("Product Backlog Item"),
  description: z.string().min(1),
  acceptanceCriteria: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  assignedTo: z.string().min(1).optional(),
  areaPath: z.string().min(1).optional(),
  iterationPath: z.string().min(1).optional(),
  priority: z.number().int().min(1).max(4).optional(),
  parentId: z.number().int().positive().optional(),
  currentSqlExcerpt: z.string().optional(),
  proposedSqlExcerpt: z.string().optional(),
  adoWorkItemId: z.number().int().positive().optional(),
  publishedAt: IsoDateTimeSchema.optional(),
  rejectReason: z.string().optional(),
});

export type WorkItemDraft = z.infer<typeof WorkItemDraftSchema>;

function nowIso(): string {
  return new Date().toISOString();
}

function draftPath(id: string, draftsDir: string): string {
  return path.join(draftsDir, `${id}.json`);
}

function ensureDir(draftsDir: string): void {
  mkdirSync(draftsDir, { recursive: true });
}

export function readDraft(id: string, draftsDir: string = DEFAULT_DRAFTS_DIR): WorkItemDraft {
  const raw = readFileSync(draftPath(id, draftsDir), "utf8");
  return WorkItemDraftSchema.parse(JSON.parse(raw));
}

export function writeDraft(draft: WorkItemDraft, draftsDir: string = DEFAULT_DRAFTS_DIR): void {
  ensureDir(draftsDir);
  writeFileSync(draftPath(draft.id, draftsDir), `${JSON.stringify(draft, null, 2)}\n`, "utf8");
}

export function getDraft(
  id: string,
  draftsDir: string = DEFAULT_DRAFTS_DIR,
): WorkItemDraft | undefined {
  if (!existsSync(draftPath(id, draftsDir))) {
    return undefined;
  }
  try {
    return readDraft(id, draftsDir);
  } catch {
    return undefined;
  }
}

export function listDrafts(draftsDir: string = DEFAULT_DRAFTS_DIR): WorkItemDraft[] {
  if (!existsSync(draftsDir)) {
    return [];
  }
  const out: WorkItemDraft[] = [];
  for (const name of readdirSync(draftsDir)) {
    if (!name.endsWith(".json")) {
      continue;
    }
    try {
      out.push(readDraft(name.slice(0, -5), draftsDir));
    } catch {
      // Skip corrupt files rather than failing the whole queue.
    }
  }
  return out.sort((a, b) => {
    const statusRank = Number(b.status === "pending") - Number(a.status === "pending");
    if (statusRank !== 0) {
      return statusRank;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function findPendingDraftForObject(
  databaseSlug: string,
  objectName: string,
  draftsDir: string = DEFAULT_DRAFTS_DIR,
): WorkItemDraft | undefined {
  return listDrafts(draftsDir).find(
    (draft) =>
      draft.status === "pending" &&
      draft.databaseSlug === databaseSlug &&
      draft.objectName === objectName,
  );
}

export function markDraftPublished(
  id: string,
  adoWorkItemId: number,
  draftsDir: string = DEFAULT_DRAFTS_DIR,
): WorkItemDraft {
  const draft = getDraft(id, draftsDir);
  if (!draft) {
    throw new Error("Draft not found");
  }
  if (draft.status !== "pending") {
    throw new Error("Only pending drafts can be published");
  }
  const next: WorkItemDraft = {
    ...draft,
    status: "published",
    updatedAt: nowIso(),
    publishedAt: nowIso(),
    adoWorkItemId,
    rejectReason: undefined,
  };
  writeDraft(next, draftsDir);
  return next;
}

export function markDraftRejected(
  id: string,
  rejectReason?: string,
  draftsDir: string = DEFAULT_DRAFTS_DIR,
): WorkItemDraft {
  const draft = getDraft(id, draftsDir);
  if (!draft) {
    throw new Error("Draft not found");
  }
  if (draft.status !== "pending") {
    throw new Error("Only pending drafts can be rejected");
  }
  const next: WorkItemDraft = {
    ...draft,
    status: "rejected",
    updatedAt: nowIso(),
    rejectReason: rejectReason?.trim() || undefined,
  };
  writeDraft(next, draftsDir);
  return next;
}

/** Test / agent helper: remove a draft file entirely. */
export function deleteDraft(id: string, draftsDir: string = DEFAULT_DRAFTS_DIR): void {
  const file = draftPath(id, draftsDir);
  if (existsSync(file)) {
    unlinkSync(file);
  }
}
