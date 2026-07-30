import { buildDraftFromImport } from "../component-tree-builder";
import { normalizeHtmlSnapshot } from "../html-normalizer";
import { normalizeScreenshotImport } from "../screenshot-normalizer";
import { createProjectFromImport } from "../../../features/projects/create-project";

describe("import pipeline", () => {
  it("creates a reusable draft from an html snapshot", () => {
    const source = normalizeHtmlSnapshot({
      sourceType: "html_snapshot",
      sourceLabel: "Pricing page",
      originalUrl: "https://example.com/pricing",
      html: "<main><h1>Pricing</h1><p>Choose a plan</p><button>Start trial</button></main>",
    });

    const draft = buildDraftFromImport("project_1", source);

    expect(draft.nodes.length).toBeGreaterThan(1);
    expect(draft.screen.manualReviewRegions).toHaveLength(0);

    const snapshot = createProjectFromImport(source, {
      sourceLabel: "Pricing page",
      originalUrl: "https://example.com/pricing",
      contentRef: "html:pricing",
    });

    expect(snapshot.importResult.status).toBe("draft_ready");
    expect(snapshot.snapshot.nodes.length).toBeGreaterThan(1);
  });

  it("flags screenshot imports for manual review", () => {
    const source = normalizeScreenshotImport({
      sourceType: "screenshot_image",
      sourceLabel: "Dashboard capture",
      fileName: "dashboard.png",
      mimeType: "image/png",
      width: 1440,
      height: 900,
      contentRef: "blob:dashboard",
    });

    const snapshot = createProjectFromImport(source, {
      sourceLabel: "Dashboard capture",
      originalUrl: null,
      contentRef: "blob:dashboard",
    });

    expect(snapshot.importResult.status).toBe("needs_review");
    expect(snapshot.snapshot.screen.manualReviewRegions.length).toBeGreaterThan(0);
  });
});