import type React from "react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PreviewFrame } from "@hrms/ui/preview-frame";

import type { PrototypeBundle } from "../../schemas/prototype-bundle";
import { PreviewErrorState } from "./preview-error-state";
import { loadPreviewBundle } from "./preview-loader";

export function PreviewPage(): React.JSX.Element {
  const { projectId, revisionId } = useParams();
  const [bundle, setBundle] = useState<PrototypeBundle | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !revisionId) {
      setErrorMessage("A published project and revision are required to open preview mode.");
      return;
    }

    void loadPreviewBundle(projectId, revisionId).then((loadedBundle) => {
      if (loadedBundle.error) {
        setErrorMessage(loadedBundle.error);
        return;
      }

      setBundle(loadedBundle.bundle);
      setErrorMessage(null);
    });
  }, [projectId, revisionId]);

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
        <PreviewErrorState message={errorMessage} />
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-slate-300">Loading published prototype...</div>
      </main>
    );
  }

  const renderNodes = bundle.nodes.filter((node) => node.id !== bundle.screen.rootNodeId);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <section className="mx-auto grid max-w-6xl gap-6">
        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-300">Published prototype</p>
          <h1 className="text-4xl font-semibold text-white">{bundle.project.name}</h1>
          <p className="text-sm leading-6 text-slate-400">Published revision {bundle.revision.versionNumber} rendered from the exported prototype bundle.</p>
        </div>
        <PreviewFrame title="Prototype Preview">
          <div className="relative mx-auto overflow-hidden rounded-[28px] border border-slate-800 bg-white" style={{ width: bundle.screen.canvasSize.width / 2, height: bundle.screen.canvasSize.height / 2 }}>
            {renderNodes.map((node) => (
              <div
                key={node.id}
                className="absolute overflow-hidden rounded-2xl border border-slate-300/70 bg-slate-50 text-slate-900 shadow-sm"
                style={{
                  left: node.bounds.x / 2,
                  top: node.bounds.y / 2,
                  width: node.bounds.width / 2,
                  height: node.bounds.height / 2,
                }}
              >
                <div className="flex h-full items-center justify-center p-4 text-center text-sm font-medium">
                  {node.content.kind === "text"
                    ? node.content.value
                    : node.content.kind === "image"
                      ? node.content.alt || node.componentType
                      : node.content.kind === "input"
                        ? node.content.placeholder || node.componentType
                        : node.componentType}
                </div>
              </div>
            ))}
          </div>
        </PreviewFrame>
      </section>
    </main>
  );
}