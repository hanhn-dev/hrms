"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { PageHelpNote } from "@/shared/ui/page-help";

type ShellHeaderContextValue = {
  employeeLabel: string | null;
  setEmployeeLabel: (label: string | null) => void;
  helpNotes: PageHelpNote[];
  setHelpSource: (source: string, notes: PageHelpNote[]) => void;
};

const ShellHeaderContext = createContext<ShellHeaderContextValue | null>(null);

export function ShellHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [employeeLabel, setEmployeeLabel] = useState<string | null>(null);
  const [notesBySource, setNotesBySource] = useState<
    Record<string, PageHelpNote[]>
  >({});
  const helpNotes = useMemo(
    () =>
      Object.keys(notesBySource)
        .sort()
        .flatMap((source) => notesBySource[source] ?? []),
    [notesBySource],
  );
  const setHelpSource = useCallback((source: string, notes: PageHelpNote[]) => {
    setNotesBySource((current) => {
      if (notes.length === 0) {
        if (!(source in current)) {
          return current;
        }
        const next = { ...current };
        delete next[source];
        return next;
      }
      const previous = current[source];
      if (sameHelpNotes(previous, notes)) {
        return current;
      }
      return { ...current, [source]: notes };
    });
  }, []);
  const value = useMemo(
    () => ({
      employeeLabel,
      setEmployeeLabel,
      helpNotes,
      setHelpSource,
    }),
    [employeeLabel, helpNotes, setHelpSource],
  );

  return (
    <ShellHeaderContext.Provider value={value}>
      {children}
    </ShellHeaderContext.Provider>
  );
}

export function useShellEmployeeLabel(): string | null {
  return useContext(ShellHeaderContext)?.employeeLabel ?? null;
}

export function useShellHelpNotes(): PageHelpNote[] {
  return useContext(ShellHeaderContext)?.helpNotes ?? [];
}

export function EmployeeHeaderLabel({
  label,
}: {
  label: string;
}): null {
  const context = useContext(ShellHeaderContext);

  useLayoutEffect(() => {
    if (!context) {
      return;
    }
    context.setEmployeeLabel(label);
    return () => {
      context.setEmployeeLabel(null);
    };
  }, [context, label]);

  return null;
}

export function PageHelp({
  source,
  notes,
}: {
  source: string;
  notes: PageHelpNote[];
}): null {
  const setHelpSource = useContext(ShellHeaderContext)?.setHelpSource;

  useLayoutEffect(() => {
    if (!setHelpSource) {
      return;
    }
    setHelpSource(source, notes);
    return () => {
      setHelpSource(source, []);
    };
  }, [notes, setHelpSource, source]);

  return null;
}

function sameHelpNotes(
  previous: PageHelpNote[] | undefined,
  next: PageHelpNote[],
): boolean {
  if (!previous || previous.length !== next.length) {
    return false;
  }
  return previous.every(
    (note, index) =>
      note.id === next[index]?.id &&
      note.type === next[index]?.type &&
      note.title === next[index]?.title &&
      note.description === next[index]?.description,
  );
}
