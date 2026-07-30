import type React from "react";

import type { DraftScreen, EditableComponentNode } from "../../schemas/design-project";

export function EditorCanvas({
  screen,
  nodes,
  selectedNodeId,
  onSelect,
}: {
  screen: DraftScreen;
  nodes: readonly EditableComponentNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}): React.JSX.Element {
  const renderNodes = nodes.filter((node) => node.id !== screen.rootNodeId);

  return (
    <div className="overflow-auto rounded-[32px] border border-slate-800 bg-slate-950/70 p-8">
      <div
        className="relative mx-auto overflow-hidden rounded-[28px] border border-slate-800 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.35)]"
        style={{
          width: screen.canvasSize.width / 2,
          height: screen.canvasSize.height / 2,
          transformOrigin: "top center",
        }}
      >
        {renderNodes.map((node) => (
            <button
              key={node.id}
              aria-label={`Canvas node ${node.id}`}
              className={`absolute overflow-hidden rounded-2xl border text-slate-900 shadow-sm ${selectedNodeId === node.id ? "border-cyan-500 bg-cyan-50" : "border-slate-300/70 bg-slate-50"}`}
              style={{
                left: node.bounds.x / 2,
                top: node.bounds.y / 2,
                width: node.bounds.width / 2,
                height: node.bounds.height / 2,
              }}
              type="button"
              onClick={() => onSelect(node.id)}
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
            </button>
        ))}
      </div>
    </div>
  );
}