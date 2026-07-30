import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { normalizeHtmlSnapshot } from "../../../lib/import/html-normalizer";
import { saveProjectSnapshot } from "../../../lib/storage/project-store";
import { EditorProvider } from "../../../app/providers/editor-provider";
import { createProjectFromImport } from "../../projects/create-project";
import { EditorPage } from "../editor-page";

describe("editor workflow", () => {
  it("lets the user select a node, edit text, and add a new component", async () => {
    const user = userEvent.setup();
    const source = normalizeHtmlSnapshot({
      sourceType: "html_snapshot",
      sourceLabel: "Marketing hero",
      originalUrl: "https://example.com",
      html: "<main><h1>Launch faster</h1><p>Prototype from your current UI.</p></main>",
    });
    const created = createProjectFromImport(source, {
      sourceLabel: "Marketing hero",
      originalUrl: "https://example.com",
      contentRef: "html:hero",
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
      expect(screen.getByRole("button", { name: /launch faster/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /launch faster/i }));

    const textInput = await screen.findByLabelText(/text content/i);
    await user.clear(textInput);
    await user.type(textInput, "Ship redesigns faster");

    await user.click(screen.getByRole("button", { name: /add text block/i }));

    expect(screen.getByDisplayValue(/ship redesigns faster/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /text block 3/i })).toBeInTheDocument();
  });
});