import { useEditorContext } from "../../app/providers/editor-provider";
import { createEntityId } from "../../lib/core/identity";
import type { EditableComponentNode } from "../../schemas/design-project";

export interface EditorActions {
  readonly selectedNode: EditableComponentNode | null;
  readonly selectNode: (nodeId: string) => void;
  readonly updateSelectedText: (value: string) => void;
  readonly updateSelectedBounds: (next: Partial<Pick<EditableComponentNode["bounds"], "x" | "y" | "width" | "height">>) => void;
  readonly addTextBlock: () => void;
  readonly addInputBlock: () => void;
  readonly addButtonBlock: () => void;
  readonly removeSelected: () => void;
}

export function useEditorActions(): EditorActions {
  const { state, dispatch } = useEditorContext();
  const selectedNode = state.selectedNodeIds.length > 0 ? state.nodesById[state.selectedNodeIds[0] ?? ""] ?? null : null;

  function selectNode(nodeId: string): void {
    dispatch({ type: "selectNodes", nodeIds: [nodeId] });
  }

  function updateSelectedText(value: string): void {
    if (!selectedNode || selectedNode.content.kind !== "text") {
      return;
    }

    dispatch({
      type: "updateTextContent",
      nodeId: selectedNode.id,
      value,
    });
  }

  function updateSelectedBounds(next: Partial<Pick<EditableComponentNode["bounds"], "x" | "y" | "width" | "height">>): void {
    if (!selectedNode) {
      return;
    }

    dispatch({
      type: "moveNode",
      nodeId: selectedNode.id,
      x: next.x ?? selectedNode.bounds.x,
      y: next.y ?? selectedNode.bounds.y,
    });
    dispatch({
      type: "resizeNode",
      nodeId: selectedNode.id,
      width: next.width ?? selectedNode.bounds.width,
      height: next.height ?? selectedNode.bounds.height,
    });
  }

  function addNode(node: EditableComponentNode): void {
    if (!state.rootNodeId) {
      return;
    }

    dispatch({
      type: "addNode",
      parentId: state.rootNodeId,
      node,
    });
  }

  function createTextLikeNode(componentType: "text" | "button" | "input", label: string, role: EditableComponentNode["role"]): EditableComponentNode {
    const count = Object.values(state.nodesById).filter((node) => node.id !== state.rootNodeId).length + 1;
    return {
      id: createEntityId("node"),
      componentType,
      role,
      bounds: {
        x: 80,
        y: 80 + count * 32,
        width: 320,
        height: componentType === "button" ? 64 : 88,
        rotation: 0,
      },
      styleTokens: {
        background: componentType === "button" ? "accent.primary" : "surface.canvas",
        text: "content.primary",
      },
      content:
        componentType === "input"
          ? { kind: "input", placeholder: label, value: null }
          : { kind: "text", value: `${label} ${count}` },
      locked: false,
      children: [],
    };
  }

  function addTextBlock(): void {
    addNode(createTextLikeNode("text", "Text block", "content"));
  }

  function addInputBlock(): void {
    addNode(createTextLikeNode("input", "Input field", "control"));
  }

  function addButtonBlock(): void {
    addNode(createTextLikeNode("button", "Button", "control"));
  }

  function removeSelected(): void {
    if (!selectedNode) {
      return;
    }

    dispatch({
      type: "removeNode",
      nodeId: selectedNode.id,
    });
    dispatch({ type: "selectNodes", nodeIds: [] });
  }

  return {
    selectedNode,
    selectNode,
    updateSelectedText,
    updateSelectedBounds,
    addTextBlock,
    addInputBlock,
    addButtonBlock,
    removeSelected,
  };
}