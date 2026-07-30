import type { HtmlSnapshotImport } from "../../schemas/source-capture";
import { createEntityId } from "../core/identity";
import type { NormalizedImportRegion, NormalizedImportSource } from "./types";

const DEFAULT_WIDTH = 1440;
const DEFAULT_REGION_HEIGHT = 88;

export function normalizeHtmlSnapshot(payload: HtmlSnapshotImport): NormalizedImportSource {
  const document = new DOMParser().parseFromString(payload.html, "text/html");
  const textElements = Array.from(
    document.querySelectorAll("h1, h2, h3, p, button, a, span, li"),
  )
    .map((element) => element.textContent?.trim() ?? "")
    .filter((value) => value.length > 0)
    .slice(0, 8);
  const imageElements = Array.from(document.querySelectorAll("img")).slice(0, 4);

  const textRegions = textElements.map<NormalizedImportRegion>((value, index) => ({
    id: createEntityId("region"),
    componentType: index === 0 ? "heading" : "text",
    role: "content",
    label: value,
    bounds: {
      x: 96,
      y: 96 + index * (DEFAULT_REGION_HEIGHT + 20),
      width: DEFAULT_WIDTH - 192,
      height: DEFAULT_REGION_HEIGHT,
    },
    content: {
      kind: "text",
      value,
    },
    confidence: 0.88,
  }));

  const imageRegions = imageElements.map<NormalizedImportRegion>((element, index) => ({
    id: createEntityId("region"),
    componentType: "image",
    role: "media",
    label: element.getAttribute("alt")?.trim() || `Image ${index + 1}`,
    bounds: {
      x: 96,
      y: 160 + (textRegions.length + index) * (DEFAULT_REGION_HEIGHT + 24),
      width: 480,
      height: 280,
    },
    content: {
      kind: "image",
      assetRef: element.getAttribute("src")?.trim() || `image-${index + 1}`,
      alt: element.getAttribute("alt"),
    },
    confidence: 0.72,
  }));

  const fallbackRegions =
    textRegions.length === 0 && imageRegions.length === 0
      ? [
          {
            id: createEntityId("region"),
            componentType: "frame",
            role: "layout" as const,
            label: "Imported layout",
            bounds: {
              x: 64,
              y: 64,
              width: DEFAULT_WIDTH - 128,
              height: 720,
            },
            content: { kind: "none" } as const,
            confidence: 0.45,
          },
        ]
      : [];

  const regions = [...textRegions, ...imageRegions, ...fallbackRegions];

  return {
    kind: "html_snapshot",
    sourceLabel: payload.sourceLabel,
    originalUrl: payload.originalUrl ?? null,
    width: DEFAULT_WIDTH,
    height: Math.max(960, 220 + regions.length * 120),
    confidenceScore: regions.some((region) => region.confidence < 0.6) ? 0.58 : 0.84,
    regions,
  };
}