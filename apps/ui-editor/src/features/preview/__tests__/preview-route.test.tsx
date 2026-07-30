import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { normalizeHtmlSnapshot } from "../../../lib/import/html-normalizer";
import { savePrototypeBundle } from "../../../lib/storage/project-store";
import { createProjectFromImport } from "../../projects/create-project";
import { PreviewPage } from "../preview-page";

describe("preview route", () => {
  it("renders a published revision in read-only mode", async () => {
    const source = normalizeHtmlSnapshot({
      sourceType: "html_snapshot",
      sourceLabel: "Preview route",
      originalUrl: "https://example.com/preview",
      html: "<main><h1>Preview route</h1><p>Read only prototype</p></main>",
    });
    const created = createProjectFromImport(source, {
      sourceLabel: "Preview route",
      originalUrl: "https://example.com/preview",
      contentRef: "html:preview-route",
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

    render(
      <MemoryRouter initialEntries={[`/projects/${created.snapshot.project.id}/revisions/${created.snapshot.revision.id}/preview`]}>
        <Routes>
          <Route path="/projects/:projectId/revisions/:revisionId/preview" element={<PreviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /preview route/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/read only prototype/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add text block/i })).not.toBeInTheDocument();
  });
});