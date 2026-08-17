"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FeatureMarkdown } from "./feature-markdown";

export function FeatureEditor({
  slug,
  title,
  initialMarkdown,
}: {
  slug: string;
  title: string;
  initialMarkdown: string;
}): React.JSX.Element {
  const router = useRouter();
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const preview = useMemo(() => {
    return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  }, [markdown]);

  async function onSubmit(): Promise<void> {
    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch("/api/features/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, markdown }),
      });
      const payload = (await response.json()) as { error?: string; proposal?: { id: string } };
      if (!response.ok) {
        setError(payload.error ?? "Could not submit proposal");
        return;
      }
      router.push(`/features/proposals/${payload.proposal?.id ?? ""}`);
      router.refresh();
    } catch {
      setError("Could not submit proposal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Edit {title}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Saving files a proposal. The live guide does not change until an Admin
            approves it.
          </p>
        </div>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-indigo-600"
          disabled={submitting || markdown.trim().length === 0}
          onClick={() => {
            void onSubmit();
          }}
          type="button"
        >
          {submitting ? "Submitting…" : "Submit for review"}
        </button>
      </div>
      {error ? (
        <p className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100">
          {error}
        </p>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <label className="flex min-h-0 flex-col border-r border-slate-200 dark:border-slate-800">
          <span className="sr-only">Markdown</span>
          <textarea
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm text-slate-900 outline-none dark:text-slate-100"
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
            value={markdown}
          />
        </label>
        <div className="min-h-0 overflow-y-auto px-6 py-4">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <FeatureMarkdown content={preview} />
          </div>
        </div>
      </div>
    </div>
  );
}
