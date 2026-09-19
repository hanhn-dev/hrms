import { Empty, List, Tag, Typography } from "antd";
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
    <List
      size="small"
      bordered
      className="autofill:max-h-72 autofill:overflow-auto"
      dataSource={fields}
      renderItem={(field) => {
        const checked = selectedIds.includes(field.id);
        const muted = field.disabled || field.readOnly;
        return (
          <List.Item
            className={`autofill:cursor-pointer ${muted ? "autofill:opacity-50" : ""}`}
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
            <div className="autofill:flex autofill:w-full autofill:items-start autofill:gap-2">
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
          </List.Item>
        );
      }}
    />
  );
}
