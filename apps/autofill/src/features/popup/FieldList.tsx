import { Empty, Listy, Tag, Typography } from "antd";
import type { ScannedField } from "@/shared/messaging";

export interface FieldListProps {
  fields: ScannedField[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function kindColor(kind: ScannedField["kind"]): string {
  switch (kind) {
    case "email":
      return "blue";
    case "phone":
      return "green";
    case "date":
      return "purple";
    case "number":
      return "orange";
    case "textarea":
      return "cyan";
    case "select":
      return "magenta";
    case "radio":
      return "gold";
    default:
      return "default";
  }
}

export function FieldList({
  fields,
  selectedIds,
  onSelectionChange,
}: FieldListProps) {
  if (fields.length === 0) {
    return (
      <Empty
        description="No fields scanned yet. Open a form page and click Scan."
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Listy
      className="autofill:max-h-72 autofill:overflow-auto autofill:rounded-md autofill:border autofill:border-solid autofill:border-neutral-200"
      items={fields}
      rowKey="id"
      styles={{ item: { padding: 0 } }}
      itemRender={(field) => {
        const checked = selectedIds.includes(field.id);
        const muted = field.disabled || field.readOnly;
        return (
          <div
            className={`autofill:flex autofill:w-full autofill:cursor-pointer autofill:items-start autofill:gap-2 autofill:px-3 autofill:py-2 ${muted ? "autofill:opacity-50" : ""}`}
            onClick={() => {
              if (muted) {
                return;
              }
              if (checked) {
                onSelectionChange(selectedIds.filter((id) => id !== field.id));
              } else {
                onSelectionChange([...selectedIds, field.id]);
              }
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={muted}
              readOnly
              className="autofill:mt-1"
              aria-label={`Select ${field.label}`}
            />
            <div className="autofill:min-w-0 autofill:flex-1">
              <Typography.Text ellipsis={{ tooltip: field.label }}>
                {field.label}
              </Typography.Text>
              <div className="autofill:mt-1 autofill:flex autofill:flex-wrap autofill:gap-1">
                <Tag color={kindColor(field.kind)}>{field.kind}</Tag>
                {field.disabled && <Tag>disabled</Tag>}
                {field.readOnly && <Tag>readonly</Tag>}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
