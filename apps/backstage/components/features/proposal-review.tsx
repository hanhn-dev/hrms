"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Proposal } from "@/lib/proposals";
import { FeatureMarkdown } from "./feature-markdown";

function bodyOf(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export function ProposalReview({
  proposal,
  publishedMarkdown,
  isAdmin,
  isAuthor,
}: {
  proposal: Proposal;
  publishedMarkdown: string;
  isAdmin: boolean;
  isAuthor: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const publishedBody = useMemo(() => bodyOf(publishedMarkdown), [publishedMarkdown]);
  const proposedBody = useMemo(() => bodyOf(proposal.markdown), [proposal.markdown]);

  async function post(path: string, body?: unknown): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Request failed");
        return;
      }
      if (path.endsWith("/approve")) {
        router.push(`/features/${proposal.slug}`);
      } else {
        router.push("/features/proposals");
      }
      router.refresh();
    } catch {
      setError("Request failed");
    } finally {
      setBusy(false);
    }
  }

  const pending = proposal.status === "pending";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {proposal.slug} · {proposal.status} · {proposal.author.name}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
          Proposal review
        </h1>
        {proposal.rejectReason ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            Rejected: {proposal.rejectReason}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
        ) : null}
        {pending ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            {isAdmin ? (
              <>
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-indigo-600"
                  disabled={busy}
                  onClick={() => {
                    void post(`/api/features/proposals/${proposal.id}/approve`);
                  }}
                  type="button"
                >
                  Approve and publish
                </button>
                <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                  Reject reason
                  <input
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    onChange={(event) => setReason(event.target.value)}
                    value={reason}
                  />
                </label>
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600"
                  disabled={busy || reason.trim().length === 0}
                  onClick={() => {
                    void post(`/api/features/proposals/${proposal.id}/reject`, {
                      reason: reason.trim(),
                    });
                  }}
                  type="button"
                >
                  Reject
                </button>
              </>
            ) : null}
            {isAuthor || isAdmin ? (
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-600"
                disabled={busy}
                onClick={() => {
                  void post(`/api/features/proposals/${proposal.id}/withdraw`);
                }}
                type="button"
              >
                Withdraw
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-r border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="mt-0 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Published
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <FeatureMarkdown content={publishedBody} />
          </div>
        </section>
        <section className="min-h-0 overflow-y-auto px-6 py-4">
          <h2 className="mt-0 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Proposed
          </h2>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <FeatureMarkdown content={proposedBody} />
          </div>
        </section>
      </div>
    </div>
  );
}
