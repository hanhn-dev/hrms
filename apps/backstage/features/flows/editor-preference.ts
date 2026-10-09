export const EDITOR_SETTING = "editor";

export type EditorId = "cursor" | "vscode";

/** Stored editor choice. An empty or unknown value stays Cursor. */
export function readEditor(raw: unknown): EditorId {
  const value = typeof raw === "string" ? raw.trim() : raw;
  return value === "vscode" ? "vscode" : "cursor";
}
