import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  FEATURES_DIR,
  PROPOSALS_DIR_NAME,
  featureFileExists,
  hashFeatureRaw,
  isFeatureArchiveSlug,
  parseFeatureFile,
  readFeatureRaw,
} from "./features";

const PROPOSALS_DIR = path.join(FEATURES_DIR, PROPOSALS_DIR_NAME);

const IsoDateTimeSchema = z.string().datetime({ offset: true });

const ProposalAuthorSchema = z.object({
  oid: z.string().min(1),
  name: z.string().min(1),
  email: z.string().optional(),
});

export const ProposalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);

export const ProposalMetaSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  status: ProposalStatusSchema,
  author: ProposalAuthorSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  baseLastAnalyzed: z.string().optional(),
  baseHash: z.string().min(1),
  reviewedAt: IsoDateTimeSchema.optional(),
  reviewer: ProposalAuthorSchema.optional(),
  rejectReason: z.string().optional(),
});

export type ProposalMeta = z.infer<typeof ProposalMetaSchema>;
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;
export type ProposalAuthor = z.infer<typeof ProposalAuthorSchema>;

export interface Proposal extends ProposalMeta {
  markdown: string;
}

export const SubmitProposalSchema = z.object({
  slug: z.string().min(1),
  markdown: z.string().trim().min(1),
});

export const RejectProposalSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

function nowIso(): string {
  return new Date().toISOString();
}

function metaPath(id: string): string {
  return path.join(PROPOSALS_DIR, `${id}.json`);
}

function bodyPath(id: string): string {
  return path.join(PROPOSALS_DIR, `${id}.md`);
}

function ensureDir(): void {
  mkdirSync(PROPOSALS_DIR, { recursive: true });
}

function readMeta(id: string): ProposalMeta {
  const raw = readFileSync(metaPath(id), "utf8");
  return ProposalMetaSchema.parse(JSON.parse(raw));
}

function writeMeta(meta: ProposalMeta): void {
  ensureDir();
  writeFileSync(metaPath(meta.id), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

export function listProposals(): ProposalMeta[] {
  if (!existsSync(PROPOSALS_DIR)) return [];
  const out: ProposalMeta[] = [];
  for (const name of readdirSync(PROPOSALS_DIR)) {
    if (!name.endsWith(".json")) continue;
    try {
      out.push(readMeta(name.slice(0, -5)));
    } catch {
      // Skip corrupt sidecar files rather than failing the whole queue.
    }
  }
  return out.sort((a, b) => {
    const statusRank = Number(b.status === "pending") - Number(a.status === "pending");
    if (statusRank !== 0) return statusRank;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getProposal(id: string): Proposal | undefined {
  if (!existsSync(metaPath(id)) || !existsSync(bodyPath(id))) return undefined;
  return {
    ...readMeta(id),
    markdown: readFileSync(bodyPath(id), "utf8"),
  };
}

export function getPendingProposal(slug: string): ProposalMeta | undefined {
  return listProposals().find(
    (proposal) => proposal.slug === slug && proposal.status === "pending",
  );
}

export function createProposal(
  slug: string,
  markdown: string,
  author: ProposalAuthor,
): Proposal {
  if (isFeatureArchiveSlug(slug) || !featureFileExists(slug)) {
    throw new Error("Unknown current feature slug");
  }
  const pending = getPendingProposal(slug);
  if (pending) {
    throw new Error("A proposal is already awaiting review for this guide");
  }

  const raw = readFeatureRaw(slug);
  const { lastAnalyzed } = parseFeatureFile(raw);
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const meta: ProposalMeta = {
    id,
    slug,
    status: "pending",
    author,
    createdAt,
    updatedAt: createdAt,
    baseLastAnalyzed: lastAnalyzed,
    baseHash: hashFeatureRaw(raw),
  };
  ensureDir();
  writeFileSync(bodyPath(id), markdown.replace(/\r\n/g, "\n"), "utf8");
  writeMeta(meta);
  return { ...meta, markdown: markdown.replace(/\r\n/g, "\n") };
}

export function setProposalStatus(
  id: string,
  status: Exclude<ProposalStatus, "pending">,
  reviewer?: ProposalAuthor,
  rejectReason?: string,
): Proposal {
  const proposal = getProposal(id);
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "pending") {
    throw new Error("Only pending proposals can be updated");
  }
  const next: ProposalMeta = {
    ...proposal,
    status,
    updatedAt: nowIso(),
    reviewedAt: nowIso(),
    reviewer,
    rejectReason: status === "rejected" ? rejectReason : undefined,
  };
  writeMeta(next);
  return { ...next, markdown: proposal.markdown };
}

export function publishedHash(slug: string): string {
  return hashFeatureRaw(readFeatureRaw(slug));
}

export function canAccessProposal(
  proposal: ProposalMeta,
  user: { oid: string; isAdmin: boolean },
): boolean {
  return user.isAdmin || proposal.author.oid === user.oid;
}
