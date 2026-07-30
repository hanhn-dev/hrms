import type React from "react";
import { Button } from "antd";
import { PropertyPanel } from "@hrms/ui/property-panel";

export function ComponentPalette({
  onAddText,
  onAddButton,
  onAddInput,
  onRemoveSelected,
}: {
  onAddText: () => void;
  onAddButton: () => void;
  onAddInput: () => void;
  onRemoveSelected: () => void;
}): React.JSX.Element {
  return (
    <PropertyPanel title="Component palette">
      <div className="grid gap-3">
        <Button type="primary" onClick={onAddText}>
          Add text block
        </Button>
        <Button onClick={onAddButton}>Add button</Button>
        <Button onClick={onAddInput}>Add input field</Button>
        <Button danger onClick={onRemoveSelected}>
          Remove selected
        </Button>
      </div>
    </PropertyPanel>
  );
}