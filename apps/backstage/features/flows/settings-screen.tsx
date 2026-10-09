"use client";

import { useCallback, useEffect, useState } from "react";
import { getSetting, migrateLocalSetting, setSetting } from "@/shared/client-db";
import { CHECKOUTS } from "./checkout-copy";
import { EDITOR_SETTING, readEditor, type EditorId } from "./editor-preference";
import { REPO_IDS, type RepoId } from "./model";
import { FLOW_ROOTS_SETTING, readRoots, ROOTS_KEY, type Roots } from "./roots-storage";

export function SettingsScreen(): React.JSX.Element {
  const [roots, setRoots] = useState<Roots>({});
  const [editor, setEditor] = useState<EditorId>("cursor");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = readRoots(await migrateLocalSetting(FLOW_ROOTS_SETTING, ROOTS_KEY));
        if (!cancelled) setRoots(stored);
      } catch {
        // Keep the empty form and still apply server defaults below.
      }
      try {
        const chosen = readEditor(await getSetting(EDITOR_SETTING));
        if (!cancelled) setEditor(chosen);
      } catch {
        // Cursor stays selected when the browser cannot read settings.
      }
      try {
        const response = await fetch("/api/flows/roots");
        const payload = (await response.json()) as { roots?: Roots };
        if (!cancelled) setRoots((current) => ({ ...payload.roots, ...current }));
      } catch {
        // Server defaults are optional when the browser already has a folder.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveEditor = useCallback((next: EditorId) => {
    setEditor(next);
    void setSetting(EDITOR_SETTING, next);
  }, []);

  const saveRoot = useCallback(async (repo: RepoId, startPath: string): Promise<string | null> => {
    const response = await fetch("/api/flows/roots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repo, startPath }),
    });
    const payload = (await response.json()) as { root?: string; error?: string };
    if (!response.ok || !payload.root) {
      return payload.error ?? "That folder is not the expected checkout.";
    }
    const root = payload.root;
    setRoots((current) => {
      const next = { ...current, [repo]: root };
      void setSetting(FLOW_ROOTS_SETTING, next);
      return next;
    });
    return null;
  }, []);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-6">
        <header>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Choose the git folder on this machine for each checkout, and which editor opens a source file.
          </p>
        </header>
        <section className="text-sm">
          <div className="font-medium">Editor</div>
          <p className="mt-1 text-xs text-slate-500">
            Cursor is built on VS Code, so the app cannot tell them apart. Source files open in the editor you choose here.
          </p>
          <select
            className="mt-2 rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
            value={editor}
            onChange={(event) => {
              const next = event.target.value === "vscode" ? "vscode" : "cursor";
              saveEditor(next);
            }}
          >
            <option value="cursor">Cursor</option>
            <option value="vscode">VS Code</option>
          </select>
        </section>
        <section className="flex flex-col gap-4">
          {REPO_IDS.map((repo) => (
            <CheckoutField
              key={repo}
              help={CHECKOUTS[repo].help}
              repo={repo}
              title={CHECKOUTS[repo].title}
              value={roots[repo] ?? ""}
              onSave={saveRoot}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function CheckoutField(props: {
  repo: RepoId;
  title: string;
  help: string;
  value: string;
  onSave: (repo: RepoId, startPath: string) => Promise<string | null>;
}): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = useCallback(async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/flows/browse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo: props.repo, initialPath: props.value || undefined }),
      });
      const payload = (await response.json()) as { path?: string; cancelled?: boolean; error?: string };
      if (payload.cancelled) return;
      if (!response.ok || !payload.path) {
        setError(payload.error ?? "The folder dialog could not open.");
        return;
      }
      setError(await props.onSave(props.repo, payload.path));
    } catch {
      setError("The folder dialog could not open.");
    } finally {
      setBusy(false);
    }
  }, [props.onSave, props.repo, props.value]);

  return (
    <div className="text-sm">
      <div className="font-medium">{props.title}</div>
      <p className="mt-1 text-xs text-slate-500">{props.help}</p>
      <div className="mt-1 flex items-center gap-2">
        <div className="min-w-0 flex-1 break-all rounded-md border border-slate-300 px-2 py-1 dark:border-slate-600">
          {props.value || "No folder chosen"}
        </div>
        <button
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800"
          type="button"
          disabled={busy}
          onClick={() => void choose()}
        >
          {busy ? "Choose the folder in the dialog…" : "Choose folder"}
        </button>
      </div>
      {error ? <p className="mt-1 text-amber-700">{error}</p> : null}
      {!error && props.value ? <p className="mt-1 text-xs text-slate-500">Using this folder.</p> : null}
    </div>
  );
}
