import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { normalizeHtmlSnapshot } from "../../../lib/import/html-normalizer";
import { saveProjectSnapshot } from "../../../lib/storage/project-store";
import { EditorProvider } from "../../../app/providers/editor-provider";
import { createProjectFromImport } from "../create-project";
import { EditorPage } from "../../editor/editor-page";

describe("project route", () => {
  it("loads the editor route with source context and editing panels", async () => {
    const source = normalizeHtmlSnapshot({
      sourceType: "html_snapshot",
      sourceLabel: "Pricing page",
      originalUrl: "https://example.com/pricing",
      html: "<main><h1>Pricing</h1><p>Choose a plan</p></main>",
    });
    const created = createProjectFromImport(source, {
      sourceLabel: "Pricing page",
      originalUrl: "https://example.com/pricing",
      contentRef: "html:pricing",
    });

    await saveProjectSnapshot(created.snapshot);

    render(
      <MemoryRouter initialEntries={[`/projects/${created.snapshot.project.id}`]}>
        <EditorProvider>
          <Routes>
            <Route path="/projects/:projectId" element={<EditorPage />} />
          </Routes>
        </EditorProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /pricing page/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/source reference/i)).toBeInTheDocument();
    expect(screen.getByText(/layers/i)).toBeInTheDocument();
    expect(screen.getByText(/properties/i)).toBeInTheDocument();
  });
});