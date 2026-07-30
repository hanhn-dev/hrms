import type React from "react";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { LandingPage } from "../features/import/landing-page";

const EditorPage = lazy(async () => import("../features/editor/editor-page").then((module) => ({ default: module.EditorPage })));
const PreviewPage = lazy(async () => import("../features/preview/preview-page").then((module) => ({ default: module.PreviewPage })));

export function AppRouter(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-200">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-5 text-sm">Loading editor workspace...</div>
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects/:projectId" element={<EditorPage />} />
        <Route path="/projects/:projectId/revisions/:revisionId/preview" element={<PreviewPage />} />
      </Routes>
    </Suspense>
  );
}