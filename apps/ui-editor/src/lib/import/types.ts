import type { EditableContent } from "../../schemas/design-project";
import type { SourceCapture } from "../../schemas/source-capture";

export interface NormalizedImportBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface NormalizedImportRegion {
  readonly id: string;
  readonly componentType: string;
  readonly role: "layout" | "content" | "control" | "navigation" | "media";
  readonly label: string;
  readonly bounds: NormalizedImportBounds;
  readonly content: EditableContent;
  readonly confidence: number;
}

export interface NormalizedImportSource {
  readonly kind: SourceCapture["kind"];
  readonly sourceLabel: string;
  readonly originalUrl: string | null;
  readonly width: number;
  readonly height: number;
  readonly confidenceScore: number;
  readonly regions: readonly NormalizedImportRegion[];
}