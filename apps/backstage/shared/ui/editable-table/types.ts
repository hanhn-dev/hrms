import type { ColumnType } from "antd/es/table";
import type { CommitResult, PreviewResult } from "@/shared/ui/confirm-write-modal";

export type EditorKind = "text" | "select" | "switch";

export type EditableEditorProps = {
  maxLength?: number;
  options?: Array<{ label: string; value: string | number }>;
};

export type EditableColumn<T> = ColumnType<T> & {
  editable?: boolean | ((record: T) => boolean);
  editor?: EditorKind;
  editorProps?: EditableEditorProps;
  formItemName?: string;
  required?: boolean;
};

export type ConfirmWriteConfig<T> = {
  title: (record: T, values: Record<string, unknown>) => string;
  previewAction: (
    record: T,
    values: Record<string, unknown>,
  ) => Promise<PreviewResult>;
  commitAction: (token: string) => Promise<CommitResult>;
  successMessage: string;
  onDone?: () => void;
};

export type { CommitResult, PreviewResult };
