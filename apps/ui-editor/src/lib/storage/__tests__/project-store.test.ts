import { normalizeHtmlSnapshot } from "../../import/html-normalizer";
import { createProjectFromImport } from "../../../features/projects/create-project";
import { listProjectSummaries, loadProjectSnapshot, loadPrototypeBundle, saveProjectSnapshot, savePrototypeBundle } from "../project-store";

describe("project-store", () => {
  it("saves and reloads local project snapshots", async () => {
    const source = normalizeHtmlSnapshot({
      sourceType: "html_snapshot",
      sourceLabel: "Project store",
      originalUrl: "https://example.com/store",
      html: "<main><h1>Project store</h1></main>",
    });
    const created = createProjectFromImport(source, {
      sourceLabel: "Project store",
      originalUrl: "https://example.com/store",
      contentRef: "html:store",
    });

    await saveProjectSnapshot(created.snapshot);

    const snapshot = await loadProjectSnapshot(created.snapshot.project.id);
    const summaries = await listProjectSummaries();

    expect(snapshot?.project.name).toBe("Project store");
    expect(summaries.some((summary) => summary.id === created.snapshot.project.id)).toBe(true);
  });

  it("persists prototype bundles for preview", async () => {
    const source = normalizeHtmlSnapshot({
      sourceType: "html_snapshot",
      sourceLabel: "Preview bundle",
      originalUrl: "https://example.com/preview",
      html: "<main><h1>Preview bundle</h1></main>",
    });
    const created = createProjectFromImport(source, {
      sourceLabel: "Preview bundle",
      originalUrl: "https://example.com/preview",
      contentRef: "html:preview",
    });

    await savePrototypeBundle({
      bundleVersion: 1,
      project: {
        ...created.snapshot.project,
        shareMode: "bundle_exported",
      },
      sourceCapture: created.snapshot.sourceCapture,
      revision: {
        ...created.snapshot.revision,
        status: "published",
      },
      screen: created.snapshot.screen,
      nodes: created.snapshot.nodes,
      exportedAt: "2026-05-22T12:00:00.000Z",
    });

    const bundle = await loadPrototypeBundle(created.snapshot.project.id, created.snapshot.revision.id);

    expect(bundle?.revision.status).toBe("published");
  });
});