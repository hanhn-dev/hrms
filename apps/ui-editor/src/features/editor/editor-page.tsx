import type React from "react";
import { useEffect, useState } from "react";
import { Button, Card } from "antd";
import { EditorShell } from "@hrms/ui/editor-shell";
import { useNavigate, useParams } from "react-router-dom";

import { exportPrototypeBundle } from "../../lib/export/prototype-bundle";
import { loadProjectSnapshot, type ProjectSnapshot } from "../../lib/storage/project-store";
import { useEditorContext } from "../../app/providers/editor-provider";
import { selectSelectedNodes } from "../../state/selectors";
import { ProjectEmptyState } from "../projects/project-empty-state";
import { ProjectErrorState } from "../projects/project-error-state";
import { ProjectLoader } from "../projects/project-loader";
import { ManualReviewPanel } from "../import/manual-review-panel";
import { LayersPanel } from "./layers-panel";
import { ComponentPalette } from "./component-palette";
import { EditorCanvas } from "./editor-canvas";
import { ManualReviewOverlay } from "./manual-review-overlay";
import { PropertyInspector } from "./property-inspector";
import { buildPublishedArtifacts, buildSavedSnapshot } from "../projects/revision-service";
import { SaveStatus } from "../projects/save-status";
import { SourceReferencePanel } from "./source-reference-panel";
import { useEditorActions } from "./use-editor-actions";
import { saveProjectSnapshot, savePrototypeBundle } from "../../lib/storage/project-store";

export function EditorPage(): React.JSX.Element {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useEditorContext();
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const editorActions = useEditorActions();

  useEffect(() => {
    if (!projectId) {
      setErrorMessage("A project identifier is required to open the editor.");
      setIsLoading(false);
      return;
    }

    void loadProjectSnapshot(projectId)
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setErrorMessage(nextSnapshot ? null : "This project could not be restored from local storage.");
        if (nextSnapshot) {
          dispatch({
            type: "hydrate",
            nodes: nextSnapshot.nodes,
            rootNodeId: nextSnapshot.screen.rootNodeId,
          });
        }
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load this project.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [dispatch, projectId]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    function handleKeydown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSaveDraft();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [snapshot, state]);

  if (isLoading) {
    return <ProjectLoader />;
  }

  if (errorMessage) {
    return <ProjectErrorState message={errorMessage} />;
  }

  if (!snapshot) {
    return <ProjectEmptyState />;
  }

  const editorNodes = Object.values(state.nodesById);
  const displayNodes = editorNodes.length > 0 ? editorNodes : [...snapshot.nodes];
  const layerNodes = displayNodes.filter((node) => node.id !== snapshot.screen.rootNodeId);
  const selectedNode = editorActions.selectedNode ?? selectSelectedNodes(state)[0] ?? null;

  async function handleSaveDraft(): Promise<void> {
    setSaveStatus("saving");

    try {
      const nextSnapshot = buildSavedSnapshot(snapshot, state);
      await saveProjectSnapshot(nextSnapshot);
      setSnapshot(nextSnapshot);
      setSaveStatus("saved");
      setErrorMessage(null);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save draft.");
    }
  }

  async function handlePublishPrototype(): Promise<void> {
    setSaveStatus("saving");

    try {
      const published = buildPublishedArtifacts(snapshot, state);
      await saveProjectSnapshot(published.snapshot);
      await savePrototypeBundle(published.bundle);
      setSnapshot(published.snapshot);
      setSaveStatus("saved");
      setErrorMessage(null);
      navigate(`/projects/${published.snapshot.project.id}/revisions/${published.snapshot.revision.id}/preview`);
    } catch (error) {
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to publish prototype.");
    }
  }

  async function handleExportBundle(): Promise<void> {
    const published = buildPublishedArtifacts(snapshot, state);
    await savePrototypeBundle(published.bundle);
    exportPrototypeBundle(published.bundle);
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-slate-50">
      <EditorShell
        sidebar={
          <div className="grid gap-4 p-4">
            <SourceReferencePanel sourceCapture={snapshot.sourceCapture} />
            <ManualReviewPanel items={snapshot.screen.manualReviewRegions} />
            <LayersPanel
              nodes={layerNodes}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={editorActions.selectNode}
            />
          </div>
        }
        inspector={
          <div className="grid gap-4 p-4">
            <Card title="Draft summary" className="border-slate-800 bg-slate-950/80 text-slate-100">
              <p className="text-sm text-slate-300">{displayNodes.length - 1} editable components detected.</p>
              <p className="mt-2 text-sm text-slate-300">{snapshot.screen.manualReviewRegions.length} manual review markers.</p>
            </Card>
            <div className="grid gap-3">
              <Button type="primary" onClick={() => void handleSaveDraft()}>
                Save draft
              </Button>
              <p className="text-xs text-slate-400">Keyboard shortcut: Ctrl+S or Cmd+S saves the current draft locally.</p>
              <Button onClick={() => void handlePublishPrototype()}>Publish prototype</Button>
              <Button onClick={() => void handleExportBundle()}>Export prototype bundle</Button>
              <SaveStatus saveStatus={saveStatus} errorMessage={errorMessage} />
            </div>
            <PropertyInspector
              node={selectedNode}
              onTextChange={editorActions.updateSelectedText}
              onBoundsChange={editorActions.updateSelectedBounds}
            />
            <ComponentPalette
              onAddText={editorActions.addTextBlock}
              onAddButton={editorActions.addButtonBlock}
              onAddInput={editorActions.addInputBlock}
              onRemoveSelected={editorActions.removeSelected}
            />
          </div>
        }
      >
        <section className="grid gap-6 p-6">
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-300">Editable draft</p>
            <h1 className="text-3xl font-semibold text-white">{snapshot.project.name}</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-400">
              Review the recreated layout, inspect flagged regions, and continue iterating in the next phase with full component editing controls.
            </p>
          </div>
          <div className="relative">
            <EditorCanvas
              screen={snapshot.screen}
              nodes={displayNodes}
              selectedNodeId={selectedNode?.id ?? null}
              onSelect={editorActions.selectNode}
            />
            <ManualReviewOverlay regions={snapshot.screen.manualReviewRegions} />
          </div>
        </section>
      </EditorShell>
    </div>
  );
}