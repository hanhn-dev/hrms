import type React from "react";
import { Input, InputNumber } from "antd";
import { PropertyPanel } from "@hrms/ui/property-panel";

import type { EditableComponentNode } from "../../schemas/design-project";

export function PropertyInspector({
  node,
  onTextChange,
  onBoundsChange,
}: {
  node: EditableComponentNode | null;
  onTextChange: (value: string) => void;
  onBoundsChange: (next: Partial<Pick<EditableComponentNode["bounds"], "x" | "y" | "width" | "height">>) => void;
}): React.JSX.Element {
  if (!node) {
    return (
      <PropertyPanel title="Properties">
        <p className="text-sm text-slate-300">Select a component to inspect its content, size, and position.</p>
      </PropertyPanel>
    );
  }

  return (
    <PropertyPanel title="Properties">
      <div className="grid gap-4 text-sm text-slate-200">
        <p id="property-inspector-help" className="text-xs leading-5 text-slate-400">
          Use the text field for copy changes. Numeric fields support keyboard arrow adjustments for precise movement and sizing.
        </p>
        {node.content.kind === "text" ? (
          <label className="grid gap-2" htmlFor="selected-text-content">
            Text content
            <Input id="selected-text-content" value={node.content.value} onChange={(event) => onTextChange(event.target.value)} aria-describedby="property-inspector-help" />
          </label>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2" htmlFor="selected-node-x">
            X
            <InputNumber id="selected-node-x" className="w-full" value={node.bounds.x} onChange={(value) => onBoundsChange({ x: Number(value ?? node.bounds.x) })} aria-describedby="property-inspector-help" />
          </label>
          <label className="grid gap-2" htmlFor="selected-node-y">
            Y
            <InputNumber id="selected-node-y" className="w-full" value={node.bounds.y} onChange={(value) => onBoundsChange({ y: Number(value ?? node.bounds.y) })} aria-describedby="property-inspector-help" />
          </label>
          <label className="grid gap-2" htmlFor="selected-node-width">
            Width
            <InputNumber id="selected-node-width" className="w-full" min={1} value={node.bounds.width} onChange={(value) => onBoundsChange({ width: Number(value ?? node.bounds.width) })} aria-describedby="property-inspector-help" />
          </label>
          <label className="grid gap-2" htmlFor="selected-node-height">
            Height
            <InputNumber id="selected-node-height" className="w-full" min={1} value={node.bounds.height} onChange={(value) => onBoundsChange({ height: Number(value ?? node.bounds.height) })} aria-describedby="property-inspector-help" />
          </label>
        </div>
      </div>
    </PropertyPanel>
  );
}