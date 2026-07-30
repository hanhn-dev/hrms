import { z } from "zod";

import { DesignProjectSchema, DraftScreenSchema, EditableComponentNodeSchema, PrototypeRevisionSchema } from "./design-project";
import { SourceCaptureSchema } from "./source-capture";

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const ImportResultSchema = z.object({
  projectId: z.string().min(1),
  revisionId: z.string().min(1),
  screenId: z.string().min(1),
  status: z.enum(["draft_ready", "needs_review"]),
  manualReviewCount: z.number().int().nonnegative(),
});

export const PrototypeBundleSchema = z
  .object({
    bundleVersion: z.number().int().positive(),
    project: DesignProjectSchema,
    sourceCapture: SourceCaptureSchema,
    revision: PrototypeRevisionSchema,
    screen: DraftScreenSchema,
    nodes: z.array(EditableComponentNodeSchema),
    exportedAt: IsoDateTimeSchema,
  })
  .superRefine((value, context) => {
    if (value.revision.status !== "published") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only published revisions can be exported as prototype bundles.",
        path: ["revision", "status"],
      });
    }
  });

export type ImportResult = z.infer<typeof ImportResultSchema>;
export type PrototypeBundle = z.infer<typeof PrototypeBundleSchema>;