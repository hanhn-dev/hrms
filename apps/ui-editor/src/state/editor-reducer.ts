import type { EditableComponentNode } from "../schemas/design-project";

export interface EditorState {
  readonly nodesById: Readonly<Record<string, EditableComponentNode>>;
  readonly rootNodeId: string | null;
  readonly selectedNodeIds: readonly string[];
  readonly isDirty: boolean;
}

export type EditorAction =
  | {
      readonly type: "hydrate";
      readonly nodes: readonly EditableComponentNode[];
      readonly rootNodeId: string;
    }
  | {
      readonly type: "selectNodes";
      readonly nodeIds: readonly string[];
    }
  | {
      readonly type: "moveNode";
      readonly nodeId: string;
      readonly x: number;
      readonly y: number;
    }
  | {
      readonly type: "resizeNode";
      readonly nodeId: string;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly type: "updateTextContent";
      readonly nodeId: string;
      readonly value: string;
    }
  | {
      readonly type: "updateStyleToken";
      readonly nodeId: string;
      readonly token: string;
      readonly value: string;
    }
  | {
      readonly type: "addNode";
      readonly node: EditableComponentNode;
      readonly parentId: string;
    }
  | {
      readonly type: "removeNode";
      readonly nodeId: string;
    };

export const initialEditorState: EditorState = {
  nodesById: {},
  rootNodeId: null,
  selectedNodeIds: [],
  isDirty: false,
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "hydrate": {
      return {
        nodesById: Object.fromEntries(action.nodes.map((node) => [node.id, node])),
        rootNodeId: action.rootNodeId,
        selectedNodeIds: [],
        isDirty: false,
      };
    }
    case "selectNodes": {
      return {
        ...state,
        selectedNodeIds: [...action.nodeIds],
      };
    }
    case "moveNode": {
      const node = state.nodesById[action.nodeId];

      if (!node) {
        return state;
      }

      return {
        ...state,
        isDirty: true,
        nodesById: {
          ...state.nodesById,
          [action.nodeId]: {
            ...node,
            bounds: {
              ...node.bounds,
              x: action.x,
              y: action.y,
            },
          },
        },
      };
    }
    case "resizeNode": {
      const node = state.nodesById[action.nodeId];

      if (!node) {
        return state;
      }

      return {
        ...state,
        isDirty: true,
        nodesById: {
          ...state.nodesById,
          [action.nodeId]: {
            ...node,
            bounds: {
              ...node.bounds,
              width: action.width,
              height: action.height,
            },
          },
        },
      };
    }
    case "updateTextContent": {
      const node = state.nodesById[action.nodeId];

      if (!node || node.content.kind !== "text") {
        return state;
      }

      return {
        ...state,
        isDirty: true,
        nodesById: {
          ...state.nodesById,
          [action.nodeId]: {
            ...node,
            content: {
              kind: "text",
              value: action.value,
            },
          },
        },
      };
    }
    case "updateStyleToken": {
      const node = state.nodesById[action.nodeId];

      if (!node) {
        return state;
      }

      return {
        ...state,
        isDirty: true,
        nodesById: {
          ...state.nodesById,
          [action.nodeId]: {
            ...node,
            styleTokens: {
              ...node.styleTokens,
              [action.token]: action.value,
            },
          },
        },
      };
    }
    case "addNode": {
      const parent = state.nodesById[action.parentId];

      if (!parent) {
        return state;
      }

      return {
        ...state,
        isDirty: true,
        nodesById: {
          ...state.nodesById,
          [action.node.id]: action.node,
          [action.parentId]: {
            ...parent,
            children: [...parent.children, action.node.id],
          },
        },
      };
    }
    case "removeNode": {
      if (action.nodeId === state.rootNodeId || !state.nodesById[action.nodeId]) {
        return state;
      }

      const nextNodes = Object.fromEntries(
        Object.entries(state.nodesById)
          .filter(([nodeId]) => nodeId !== action.nodeId)
          .map(([nodeId, node]) => [
            nodeId,
            node.children.includes(action.nodeId)
              ? { ...node, children: node.children.filter((childId) => childId !== action.nodeId) }
              : node,
          ]),
      );

      return {
        ...state,
        nodesById: nextNodes,
        selectedNodeIds: state.selectedNodeIds.filter((nodeId) => nodeId !== action.nodeId),
        isDirty: true,
      };
    }
    default: {
      return state;
    }
  }
}