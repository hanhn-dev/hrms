import type { DesignProject, DraftScreen, EditableComponentNode, PrototypeRevision } from "../../schemas/design-project";
import type { ImportResult } from "../../schemas/prototype-bundle";
import type { SourceCapture } from "../../schemas/source-capture";
import { buildDraftFromImport } from "../../lib/import/component-tree-builder";
import type { NormalizedImportSource } from "../../lib/import/types";
import { createEntityId, createIsoTimestamp } from "../../lib/core/identity";
import type { ProjectSnapshot } from "../../lib/storage/project-store";

export interface CreatedProject {
  readonly snapshot: ProjectSnapshot;
  readonly importResult: ImportResult;
}

export function createProjectFromImport(
  source: NormalizedImportSource,
  metadata: {
    readonly sourceLabel: string;
    readonly originalUrl: string | null;
    readonly contentRef: string;
  },
): CreatedProject {
  const timestamp = createIsoTimestamp();
  const projectId = createEntityId("proj");
  const revisionId = createEntityId("rev");
  const sourceCaptureId = createEntityId("capture");

  const draft = buildDraftFromImport(projectId, source);
  const manualReviewCount = draft.screen.manualReviewRegions.length;
  const importStatus = manualReviewCount > 0 ? "needs_review" : "draft_ready";

  const sourceCapture: SourceCapture = {
    id: sourceCaptureId,
    kind: source.kind,
    sourceLabel: metadata.sourceLabel,
    originalUrl: metadata.originalUrl,
    contentRef: metadata.contentRef,
    dimensions: {
      width: source.width,
      height: source.height,
    },
    createdAt: timestamp,
  };

  const revision: PrototypeRevision = {
    id: revisionId,
    projectId,
    baseRevisionId: null,
    versionNumber: 1,
    status: "draft",
    screenId: draft.screen.id,
    createdAt: timestamp,
  };

  const project: DesignProject = {
    id: projectId,
    name: metadata.sourceLabel,
    sourceCaptureId,
    currentRevisionId: revisionId,
    shareMode: "local_only",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    snapshot: {
      project,
      sourceCapture,
      revision,
      screen: draft.screen as DraftScreen,
      nodes: draft.nodes as readonly EditableComponentNode[],
    },
    importResult: {
      projectId,
      revisionId,
      screenId: draft.screen.id,
      status: importStatus,
      manualReviewCount,
    },
  };
}