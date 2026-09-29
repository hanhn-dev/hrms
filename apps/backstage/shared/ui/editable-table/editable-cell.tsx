"use client";

import { Form, Input, Select, Switch } from "antd";
import type { EditableEditorProps, EditorKind } from "./types";

export type EditableCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  editing?: boolean;
  dataIndex?: string;
  title?: React.ReactNode;
  editor?: EditorKind;
  editorProps?: EditableEditorProps;
  required?: boolean;
  children?: React.ReactNode;
};

export function EditableCell({
  editing,
  dataIndex,
  title,
  editor = "text",
  editorProps,
  required,
  children,
  ...rest
}: EditableCellProps): React.JSX.Element {
  if (!editing || !dataIndex) {
    return <td {...rest}>{children}</td>;
  }

  const label = typeof title === "string" ? title : dataIndex;
  const input =
    editor === "switch" ? (
      <Switch size="small" />
    ) : editor === "select" ? (
      <Select
        allowClear={false}
        className="w-full"
        options={editorProps?.options}
        optionFilterProp="label"
        showSearch
      />
    ) : (
      <Input maxLength={editorProps?.maxLength} />
    );

  return (
    <td {...rest}>
      <Form.Item
        className="!mb-0"
        name={dataIndex}
        rules={
          required
            ? [{ required: true, message: `${label} is required.` }]
            : undefined
        }
        valuePropName={editor === "switch" ? "checked" : "value"}
      >
        {input}
      </Form.Item>
    </td>
  );
}
