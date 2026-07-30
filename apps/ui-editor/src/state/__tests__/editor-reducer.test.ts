import { editorReducer, initialEditorState } from "../editor-reducer";

const seedNodes = [
  {
    id: "node_root",
    componentType: "frame",
    role: "layout" as const,
    bounds: { x: 0, y: 0, width: 1000, height: 700, rotation: 0 },
    styleTokens: { background: "surface.canvas" },
    content: { kind: "none" as const },
    locked: false,
    children: ["node_text"],
  },
  {
    id: "node_text",
    componentType: "text",
    role: "content" as const,
    bounds: { x: 50, y: 80, width: 400, height: 80, rotation: 0 },
    styleTokens: { background: "surface.canvas" },
    content: { kind: "text" as const, value: "Hello" },
    locked: false,
    children: [],
  },
];

describe("editorReducer", () => {
  it("supports selection, movement, resize, and text updates", () => {
    const hydrated = editorReducer(initialEditorState, {
      type: "hydrate",
      nodes: seedNodes,
      rootNodeId: "node_root",
    });

    const selected = editorReducer(hydrated, {
      type: "selectNodes",
      nodeIds: ["node_text"],
    });
    const moved = editorReducer(selected, {
      type: "moveNode",
      nodeId: "node_text",
      x: 120,
      y: 140,
    });
    const resized = editorReducer(moved, {
      type: "resizeNode",
      nodeId: "node_text",
      width: 480,
      height: 100,
    });
    const updated = editorReducer(resized, {
      type: "updateTextContent",
      nodeId: "node_text",
      value: "Updated",
    });

    expect(updated.selectedNodeIds).toEqual(["node_text"]);
    expect(updated.nodesById.node_text?.bounds.x).toBe(120);
    expect(updated.nodesById.node_text?.bounds.width).toBe(480);
    expect(updated.nodesById.node_text?.content).toEqual({ kind: "text", value: "Updated" });
  });

  it("can add and remove nodes without corrupting the parent tree", () => {
    const hydrated = editorReducer(initialEditorState, {
      type: "hydrate",
      nodes: seedNodes,
      rootNodeId: "node_root",
    });

    const added = editorReducer(hydrated, {
      type: "addNode",
      parentId: "node_root",
      node: {
        id: "node_button",
        componentType: "button",
        role: "control",
        bounds: { x: 100, y: 200, width: 200, height: 56, rotation: 0 },
        styleTokens: { background: "accent.primary" },
        content: { kind: "text", value: "Call to action" },
        locked: false,
        children: [],
      },
    });
    const removed = editorReducer(added, {
      type: "removeNode",
      nodeId: "node_button",
    });

    expect(added.nodesById.node_root?.children).toContain("node_button");
    expect(removed.nodesById.node_button).toBeUndefined();
    expect(removed.nodesById.node_root?.children).not.toContain("node_button");
  });
});