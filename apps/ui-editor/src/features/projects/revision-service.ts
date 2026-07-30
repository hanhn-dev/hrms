import type { ProjectSnapshot } from "../../lib/storage/project-store";
import type { PrototypeBundle } from "../../schemas/prototype-bundle";
import type { EditorState } from "../../state/editor-reducer";
import { createIsoTimestamp } from "../../lib/core/identity";

export function buildSavedSnapshot(snapshot: ProjectSnapshot, editorState: EditorState): ProjectSnapshot {
  const nodes = Object.values(editorState.nodesById);
  const timestamp = createIsoTimestamp();

  return {
    ...snapshot,
    project: {
      ...snapshot.project,
      updatedAt: timestamp,
    },
    screen: {
      ...snapshot.screen,
      selectedNodeIds: [...editorState.selectedNodeIds],
    },
    nodes,
  };
}

export function buildPublishedArtifacts(snapshot: ProjectSnapshot, editorState: EditorState): {
  readonly snapshot: ProjectSnapshot;
  readonly bundle: PrototypeBundle;
} {
  const savedSnapshot = buildSavedSnapshot(snapshot, editorState);
  const timestamp = createIsoTimestamp();
  const publishedSnapshot: ProjectSnapshot = {
    ...savedSnapshot,
    project: {
      ...savedSnapshot.project,
      shareMode: "bundle_exported",
      currentRevisionId: savedSnapshot.revision.id,
      updatedAt: timestamp,
    },
    revision: {
      ...savedSnapshot.revision,
      status: "published",
      createdAt: timestamp,
    },
  };

  return {
    snapshot: publishedSnapshot,
    bundle: {
      bundleVersion: 1,
      project: publishedSnapshot.project,
      sourceCapture: publishedSnapshot.sourceCapture,
      revision: publishedSnapshot.revision,
      screen: publishedSnapshot.screen,
      nodes: [...publishedSnapshot.nodes],
      exportedAt: timestamp,
    },
  };
}