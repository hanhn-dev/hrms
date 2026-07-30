import { z } from "zod";

const IsoDateTimeSchema = z.string().datetime({ offset: true });
const EntityIdSchema = z.string().min(1);

export const SourceCaptureKindSchema = z.enum([
  "html_snapshot",
  "screenshot_image",
]);

export const DimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const SourceCaptureSchema = z.object({
  id: EntityIdSchema,
  kind: SourceCaptureKindSchema,
  sourceLabel: z.string().min(1).max(120),
  originalUrl: z.string().url().nullable(),
  contentRef: z.string().min(1),
  dimensions: DimensionsSchema.nullable(),
  createdAt: IsoDateTimeSchema,
});

export const HtmlSnapshotImportSchema = z.object({
  sourceType: z.literal("html_snapshot"),
  sourceLabel: z.string().min(1).max(120),
  originalUrl: z.string().url().optional(),
  html: z.string().trim().min(1),
});

export const ScreenshotImportSchema = z.object({
  sourceType: z.literal("screenshot_image"),
  sourceLabel: z.string().min(1).max(120),
  fileName: z.string().min(1),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  contentRef: z.string().min(1),
});

export const ImportPayloadSchema = z.discriminatedUnion("sourceType", [
  HtmlSnapshotImportSchema,
  ScreenshotImportSchema,
]);

export const ImportSessionStatusSchema = z.enum([
  "queued",
  "analyzing",
  "draft_ready",
  "needs_review",
  "failed",
]);

export const ImportSessionSchema = z.object({
  id: EntityIdSchema,
  sourceCaptureId: EntityIdSchema,
  status: ImportSessionStatusSchema,
  confidenceScore: z.number().min(0).max(1).nullable(),
  unresolvedRegionIds: z.array(EntityIdSchema),
  errorMessage: z.string().min(1).nullable(),
  completedAt: IsoDateTimeSchema.nullable(),
});

export type SourceCapture = z.infer<typeof SourceCaptureSchema>;
export type HtmlSnapshotImport = z.infer<typeof HtmlSnapshotImportSchema>;
export type ScreenshotImport = z.infer<typeof ScreenshotImportSchema>;
export type ImportPayload = z.infer<typeof ImportPayloadSchema>;
export type ImportSession = z.infer<typeof ImportSessionSchema>;