"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export const READ_MODE_STORAGE_KEY = "backstage:read-mode";

type ReadModeContextValue = {
  readMode: boolean;
  immersive: boolean;
  setReadMode: (next: boolean) => void;
  toggle: () => void;
};

const ReadModeContext = createContext<ReadModeContextValue | null>(null);

function isFeatureArticlePath(pathname: string): boolean {
  return pathname.startsWith("/features/") && pathname.length > "/features/".length;
}

export function ReadModeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const [readMode, setReadModeState] = useState(false);
  const [ready, setReady] = useState(false);
  const isArticle = isFeatureArticlePath(pathname);

  useLayoutEffect(() => {
    setReadModeState(localStorage.getItem(READ_MODE_STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  const setReadMode = useCallback((next: boolean) => {
    setReadModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setReadModeState((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(READ_MODE_STORAGE_KEY, readMode ? "1" : "0");
  }, [readMode, ready]);

  useLayoutEffect(() => {
    if (!ready) return;
    document.documentElement.toggleAttribute("data-read-mode", readMode && isArticle);
    return () => {
      document.documentElement.removeAttribute("data-read-mode");
    };
  }, [readMode, isArticle, ready]);

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      if (document.fullscreenElement) return;
      if (!readMode) return;
      setReadModeState(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readMode]);

  const value = useMemo(
    () => ({
      readMode,
      immersive: readMode && isArticle,
      setReadMode,
      toggle,
    }),
    [readMode, isArticle, setReadMode, toggle],
  );

  return <ReadModeContext.Provider value={value}>{children}</ReadModeContext.Provider>;
}

export function useReadMode(): ReadModeContextValue {
  const value = useContext(ReadModeContext);
  if (!value) {
    throw new Error("useReadMode must be used within ReadModeProvider");
  }
  return value;
}

function BookIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function ReadModeToggle({
  compact = false,
}: {
  compact?: boolean;
}): React.JSX.Element {
  const { readMode, toggle } = useReadMode();
  const label = readMode ? "Exit read mode" : "Enter read mode";

  return (
    <button
      type="button"
      aria-pressed={readMode}
      aria-label={label}
      title={readMode ? "Exit read mode (Esc)" : "Read mode"}
      onClick={toggle}
      className={
        compact
          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white " +
            (readMode
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              : "")
          : "flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white " +
            (readMode
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              : "")
      }
    >
      <BookIcon />
      {compact ? null : <span>{readMode ? "Reading" : "Read mode"}</span>}
    </button>
  );
}
