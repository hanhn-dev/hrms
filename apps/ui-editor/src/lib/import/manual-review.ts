import type { ManualReviewRegion } from "../../schemas/design-project";
import { createEntityId } from "../core/identity";
import type { NormalizedImportSource } from "./types";

const REVIEW_THRESHOLD = 0.6;

export function collectManualReviewRegions(source: NormalizedImportSource): readonly ManualReviewRegion[] {
  return source.regions
    .filter((region) => region.confidence < REVIEW_THRESHOLD)
    .map((region) => ({
      id: createEntityId("review"),
      bounds: {
        x: region.bounds.x,
        y: region.bounds.y,
        width: region.bounds.width,
        height: region.bounds.height,
        rotation: 0,
      },
      reason: source.kind === "screenshot_image" ? "ambiguous_structure" : "low_confidence",
      note:
        source.kind === "screenshot_image"
          ? "Screenshot imports need manual structure refinement before component edits are reliable."
          : `Review \"${region.label}\" because the recreated structure has reduced confidence.`,
    }));
}