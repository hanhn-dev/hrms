import type { ScreenshotImport } from "../../schemas/source-capture";
import { createEntityId } from "../core/identity";
import type { NormalizedImportSource } from "./types";

export function normalizeScreenshotImport(payload: ScreenshotImport): NormalizedImportSource {
  return {
    kind: "screenshot_image",
    sourceLabel: payload.sourceLabel,
    originalUrl: null,
    width: payload.width,
    height: payload.height,
    confidenceScore: 0.49,
    regions: [
      {
        id: createEntityId("region"),
        componentType: "image",
        role: "media",
        label: payload.fileName,
        bounds: {
          x: 0,
          y: 0,
          width: payload.width,
          height: payload.height,
        },
        content: {
          kind: "image",
          assetRef: payload.contentRef,
          alt: payload.sourceLabel,
        },
        confidence: 0.49,
      },
    ],
  };
}