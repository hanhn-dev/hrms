import { getAllFeatureDocs } from "../../lib/features";

export default function FeaturesPage(): React.JSX.Element {
  const hasDocs = getAllFeatureDocs().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <svg
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
          >
            <path d="M4 19.5V5.5A2.5 2.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v14.5" />
            <path d="M6.5 17H19v3.5a.5.5 0 0 1-.5.5H6.5A2.5 2.5 0 0 1 4 18.5v0A2.5 2.5 0 0 1 6.5 17Z" />
            <path d="M8 7h8M8 10.5h8" />
          </svg>
        </div>

        <h1 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">
          Feature guides
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Generated module/feature guides connecting SourceCode call chains to the
          underlying HRMS-DATABASE tables and stored procedures. Produced by the{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            /document-feature
          </code>{" "}
          command — see the wiki for authoritative DB lifecycle docs.
        </p>

        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            {hasDocs ? (
              <path d="M13 5l7 7-7 7M5 12h14" />
            ) : (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </>
            )}
          </svg>
          {hasDocs
            ? "Pick a feature from the list on the left to view its guide."
            : "No feature guides generated yet."}
        </p>
      </div>
    </div>
  );
}
