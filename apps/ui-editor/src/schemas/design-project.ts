import { z } from "zod";

const IsoDateTimeSchema = z.string().datetime({ offset: true });
const EntityIdSchema = z.string().min(1);

export const CanvasBoundsSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().finite(),
});

export const ManualReviewReasonSchema = z.enum([
  "low_confidence",
  "missing_asset",
  "ambiguous_structure",
]);

export const ManualReviewRegionSchema = z.object({
  id: EntityIdSchema,
  bounds: CanvasBoundsSchema,
  reason: ManualReviewReasonSchema,
  note: z.string().min(1),
});

export const EditableContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("text"),
    value: z.string(),
  }),
  z.object({
    kind: z.literal("image"),
    assetRef: z.string().min(1),
    alt: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("icon"),
    name: z.string().min(1),
  }),
  z.object({
    kind: z.literal("input"),
    placeholder: z.string().nullable(),
    value: z.string().nullable(),
  }),
]);

export const EditableComponentRoleSchema = z.enum([
  "layout",
  "content",
  "control",
  "navigation",
  "media",
]);

export const EditableComponentNodeSchema = z.object({
  id: EntityIdSchema,
  componentType: z.string().min(1),
  role: EditableComponentRoleSchema,
  bounds: CanvasBoundsSchema,
  styleTokens: z.record(z.string(), z.string()),
  content: EditableContentSchema,
  locked: z.boolean(),
  children: z.array(EntityIdSchema),
});

export const DraftScreenSchema = z.object({
  id: EntityIdSchema,
  projectId: EntityIdSchema,
  rootNodeId: EntityIdSchema,
  canvasSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  selectedNodeIds: z.array(EntityIdSchema),
  manualReviewRegions: z.array(ManualReviewRegionSchema),
});

export const DesignProjectShareModeSchema = z.enum([
  "local_only",
  "bundle_exported",
]);

export const DesignProjectSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  sourceCaptureId: EntityIdSchema,
  currentRevisionId: EntityIdSchema,
  shareMode: DesignProjectShareModeSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const PrototypeRevisionStatusSchema = z.enum(["draft", "published"]);

export const PrototypeRevisionSchema = z.object({
  id: EntityIdSchema,
  projectId: EntityIdSchema,
  baseRevisionId: EntityIdSchema.nullable(),
  versionNumber: z.number().int().positive(),
  status: PrototypeRevisionStatusSchema,
  screenId: EntityIdSchema,
  createdAt: IsoDateTimeSchema,
});

export type CanvasBounds = z.infer<typeof CanvasBoundsSchema>;
export type ManualReviewRegion = z.infer<typeof ManualReviewRegionSchema>;
export type EditableContent = z.infer<typeof EditableContentSchema>;
export type EditableComponentNode = z.infer<typeof EditableComponentNodeSchema>;
export type DraftScreen = z.infer<typeof DraftScreenSchema>;
export type DesignProject = z.infer<typeof DesignProjectSchema>;
export type PrototypeRevision = z.infer<typeof PrototypeRevisionSchema>;