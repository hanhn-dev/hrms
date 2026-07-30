import type { ProjectState, ProjectSnapshotState } from "./project-reducer";
import type { EditorState } from "./editor-reducer";

export function selectCurrentProject(state: ProjectState): ProjectSnapshotState | null {
  if (!state.currentProjectId) {
    return null;
  }

  return state.projectsById[state.currentProjectId] ?? null;
}

export function selectSelectedNodes(state: EditorState) {
  return state.selectedNodeIds
    .map((nodeId) => state.nodesById[nodeId])
    .filter((node): node is NonNullable<typeof node> => Boolean(node));
}

export function selectCanPublish(state: ProjectState): boolean {
  const currentProject = selectCurrentProject(state);

  return Boolean(currentProject && currentProject.nodes.length > 0);
}