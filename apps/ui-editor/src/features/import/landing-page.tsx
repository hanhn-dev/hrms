import type React from "react";
import { useState } from "react";
import { Card } from "antd";
import { useNavigate } from "react-router-dom";

import { ImportWorkflow } from "./import-workflow";
import { importPrototypeBundle } from "../preview/import-bundle";
import { ProjectList } from "../projects/project-list";

export function LandingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [importError, setImportError] = useState<string | null>(null);

  async function handleBundleImport(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const bundle = await importPrototypeBundle(file);
      setImportError(null);
      navigate(`/projects/${bundle.project.id}/revisions/${bundle.revision.id}/preview`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Failed to import prototype bundle.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:py-16">
        <div className="grid gap-6">
          <div className="grid gap-4">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">Prototype from what already exists</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">Recreate UI Editor</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
              Import an HTML snapshot or interface screenshot, recreate the screen into editable components, and iterate on redesign ideas without starting from a blank canvas.
            </p>
          </div>
          <ImportWorkflow />
          <Card title="Import a shared prototype bundle" className="border-slate-800 bg-slate-950/80 text-slate-100">
            <label className="grid gap-3 text-sm text-slate-200" htmlFor="prototype-bundle-file">
              Prototype bundle file
              <input id="prototype-bundle-file" accept="application/json" type="file" onChange={(event) => void handleBundleImport(event)} />
            </label>
            {importError ? <p className="mt-3 text-sm text-rose-300">{importError}</p> : null}
          </Card>
        </div>
        <ProjectList />
      </section>
    </main>
  );
}