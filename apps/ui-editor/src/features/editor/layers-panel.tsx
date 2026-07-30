import type React from "react";
import { Card, Button } from "antd";

import type { EditableComponentNode } from "../../schemas/design-project";

function getNodeLabel(node: EditableComponentNode): string {
  if (node.content.kind === "text") {
    return node.content.value;
  }

  if (node.content.kind === "input") {
    return node.content.placeholder ?? "Input field";
  }

  return node.componentType;
}

export function LayersPanel({
  nodes,
  selectedNodeId,
  onSelect,
}: {
  nodes: readonly EditableComponentNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}): React.JSX.Element {
  return (
    <Card title="Layers" className="border-slate-800 bg-slate-950/80 text-slate-100">
      <div className="grid gap-2">
        {nodes.map((node) => (
          <Button
            key={node.id}
            block
            type={selectedNodeId === node.id ? "primary" : "default"}
            onClick={() => onSelect(node.id)}
          >
            {getNodeLabel(node)}
          </Button>
        ))}
      </div>
    </Card>
  );
}