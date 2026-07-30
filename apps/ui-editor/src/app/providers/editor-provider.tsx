import type React from "react";
import { createContext, useContext, useMemo, useReducer } from "react";

import { editorReducer, initialEditorState, type EditorAction, type EditorState } from "../../state/editor-reducer";

interface EditorContextValue {
  readonly state: EditorState;
  readonly dispatch: React.Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const value = useMemo<EditorContextValue>(() => ({ state, dispatch }), [state]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext(): EditorContextValue {
  const value = useContext(EditorContext);

  if (!value) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }

  return value;
}