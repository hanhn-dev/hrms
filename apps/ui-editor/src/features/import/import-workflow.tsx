import type React from "react";
import { Card } from "antd";
import { useNavigate, useSearchParams } from "react-router-dom";

import { normalizeHtmlSnapshot } from "../../lib/import/html-normalizer";
import { normalizeScreenshotImport } from "../../lib/import/screenshot-normalizer";
import { saveProjectSnapshot } from "../../lib/storage/project-store";
import { createProjectFromImport } from "../projects/create-project";
import { HtmlImportForm } from "./html-import-form";
import { ImportModeTabs, type ImportMode } from "./import-mode-tabs";
import { ScreenshotImportForm } from "./screenshot-import-form";

export function ImportWorkflow(): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = searchParams.get("mode") === "image" ? "image" : "html";

  async function handleHtmlImport(payload: {
    readonly sourceLabel: string;
    readonly originalUrl?: string;
    readonly html: string;
  }): Promise<void> {
    const source = normalizeHtmlSnapshot({
      sourceType: "html_snapshot",
      sourceLabel: payload.sourceLabel,
      originalUrl: payload.originalUrl,
      html: payload.html,
    });
    const project = createProjectFromImport(source, {
      sourceLabel: payload.sourceLabel,
      originalUrl: payload.originalUrl ?? null,
      contentRef: `html:${payload.sourceLabel}`,
    });

    await saveProjectSnapshot(project.snapshot);
    navigate(`/projects/${project.importResult.projectId}`);
  }

  async function handleScreenshotImport(payload: {
    readonly sourceLabel: string;
    readonly fileName: string;
    readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
    readonly width: number;
    readonly height: number;
    readonly contentRef: string;
  }): Promise<void> {
    const source = normalizeScreenshotImport({
      sourceType: "screenshot_image",
      sourceLabel: payload.sourceLabel,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      width: payload.width,
      height: payload.height,
      contentRef: payload.contentRef,
    });
    const project = createProjectFromImport(source, {
      sourceLabel: payload.sourceLabel,
      originalUrl: null,
      contentRef: payload.contentRef,
    });

    await saveProjectSnapshot(project.snapshot);
    navigate(`/projects/${project.importResult.projectId}`);
  }

  return (
    <Card className="border-slate-800 bg-slate-950/80 text-slate-100">
      <ImportModeTabs
        activeMode={activeMode}
        onChange={(mode: ImportMode) => setSearchParams(mode === "image" ? { mode } : {})}
        htmlPanel={<HtmlImportForm onSubmit={handleHtmlImport} />}
        screenshotPanel={<ScreenshotImportForm onSubmit={handleScreenshotImport} />}
      />
    </Card>
  );
}