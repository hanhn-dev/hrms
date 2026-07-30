import type { DraftScreen, EditableComponentNode } from "../../schemas/design-project";
import { createEntityId } from "../core/identity";
import { collectManualReviewRegions } from "./manual-review";
import type { NormalizedImportSource } from "./types";

export interface BuiltDraft {
  readonly screen: DraftScreen;
  readonly nodes: readonly EditableComponentNode[];
}

export function buildDraftFromImport(projectId: string, source: NormalizedImportSource): BuiltDraft {
  const rootNodeId = createEntityId("node");
  const childNodes = source.regions.map<EditableComponentNode>((region) => ({
    id: createEntityId("node"),
    componentType: region.componentType,
    role: region.role,
    bounds: {
      x: region.bounds.x,
      y: region.bounds.y,
      width: region.bounds.width,
      height: region.bounds.height,
      rotation: 0,
    },
    styleTokens: {
      background: region.role === "media" ? "surface.media" : "surface.canvas",
      text: "content.primary",
      radius: region.role === "media" ? "radius.lg" : "radius.md",
    },
    content: region.content,
    locked: false,
    children: [],
  }));

  const nodes: readonly EditableComponentNode[] = [
    {
      id: rootNodeId,
      componentType: "frame",
      role: "layout",
      bounds: {
        x: 0,
        y: 0,
        width: source.width,
        height: source.height,
        rotation: 0,
      },
      styleTokens: {
        background: "surface.canvas",
        text: "content.primary",
        radius: "radius.xl",
      },
      content: { kind: "none" },
      locked: false,
      children: childNodes.map((node) => node.id),
    },
    ...childNodes,
  ];

  return {
    screen: {
      id: createEntityId("screen"),
      projectId,
      rootNodeId,
      canvasSize: {
        width: source.width,
        height: source.height,
      },
      selectedNodeIds: [],
      manualReviewRegions: [...collectManualReviewRegions(source)],
    },
    nodes,
  };
}