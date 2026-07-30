import type { DesignProject, DraftScreen, EditableComponentNode, PrototypeRevision } from "../schemas/design-project";
import type { SourceCapture } from "../schemas/source-capture";

export interface ProjectSnapshotState {
  readonly project: DesignProject;
  readonly sourceCapture: SourceCapture;
  readonly revision: PrototypeRevision;
  readonly screen: DraftScreen;
  readonly nodes: readonly EditableComponentNode[];
}

export interface ProjectState {
  readonly currentProjectId: string | null;
  readonly projectsById: Readonly<Record<string, ProjectSnapshotState>>;
  readonly saveStatus: "idle" | "saving" | "saved" | "error";
  readonly errorMessage: string | null;
}

export type ProjectAction =
  | {
      readonly type: "hydrateProjects";
      readonly snapshots: readonly ProjectSnapshotState[];
    }
  | {
      readonly type: "setCurrentProject";
      readonly projectId: string | null;
    }
  | {
      readonly type: "upsertProjectSnapshot";
      readonly snapshot: ProjectSnapshotState;
    }
  | {
      readonly type: "setSaveStatus";
      readonly saveStatus: ProjectState["saveStatus"];
      readonly errorMessage?: string | null;
    };

export const initialProjectState: ProjectState = {
  currentProjectId: null,
  projectsById: {},
  saveStatus: "idle",
  errorMessage: null,
};

export function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case "hydrateProjects": {
      return {
        ...state,
        projectsById: Object.fromEntries(
          action.snapshots.map((snapshot) => [snapshot.project.id, snapshot]),
        ),
      };
    }
    case "setCurrentProject": {
      return {
        ...state,
        currentProjectId: action.projectId,
      };
    }
    case "upsertProjectSnapshot": {
      return {
        ...state,
        currentProjectId: action.snapshot.project.id,
        projectsById: {
          ...state.projectsById,
          [action.snapshot.project.id]: action.snapshot,
        },
      };
    }
    case "setSaveStatus": {
      return {
        ...state,
        saveStatus: action.saveStatus,
        errorMessage: action.errorMessage ?? null,
      };
    }
    default: {
      return state;
    }
  }
}