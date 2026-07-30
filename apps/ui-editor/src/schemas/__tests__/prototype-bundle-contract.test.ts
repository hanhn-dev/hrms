import { PrototypeBundleSchema } from "../prototype-bundle";

const baseBundle = {
  bundleVersion: 1,
  project: {
    id: "proj_1",
    name: "Pricing redesign",
    sourceCaptureId: "capture_1",
    currentRevisionId: "rev_1",
    shareMode: "bundle_exported",
    createdAt: "2026-05-22T12:00:00.000Z",
    updatedAt: "2026-05-22T12:00:00.000Z",
  },
  sourceCapture: {
    id: "capture_1",
    kind: "html_snapshot",
    sourceLabel: "Pricing redesign",
    originalUrl: "https://example.com",
    contentRef: "html:pricing",
    dimensions: { width: 1440, height: 900 },
    createdAt: "2026-05-22T12:00:00.000Z",
  },
  revision: {
    id: "rev_1",
    projectId: "proj_1",
    baseRevisionId: null,
    versionNumber: 1,
    status: "published",
    screenId: "screen_1",
    createdAt: "2026-05-22T12:00:00.000Z",
  },
  screen: {
    id: "screen_1",
    projectId: "proj_1",
    rootNodeId: "node_root",
    canvasSize: { width: 1440, height: 900 },
    selectedNodeIds: [],
    manualReviewRegions: [],
  },
  nodes: [
    {
      id: "node_root",
      componentType: "frame",
      role: "layout",
      bounds: { x: 0, y: 0, width: 1440, height: 900, rotation: 0 },
      styleTokens: { background: "surface.canvas" },
      content: { kind: "none" },
      locked: false,
      children: [],
    },
  ],
  exportedAt: "2026-05-22T12:00:00.000Z",
} as const;

describe("PrototypeBundleSchema", () => {
  it("accepts published revision bundles", () => {
    expect(() => PrototypeBundleSchema.parse(baseBundle)).not.toThrow();
  });

  it("rejects draft revisions from being exported", () => {
    expect(() =>
      PrototypeBundleSchema.parse({
        ...baseBundle,
        revision: {
          ...baseBundle.revision,
          status: "draft",
        },
      }),
    ).toThrow();
  });
});