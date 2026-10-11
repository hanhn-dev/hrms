import Link from "next/link";
import { flowHref, getCurrentFlowDocs } from "@/lib/flow-docs";

export default function FlowDocsPage(): React.JSX.Element {
  const docs = getCurrentFlowDocs().sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold dark:text-white">Request flows</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Sequence diagrams tracing a feature&apos;s React component through the Node API
          controller and service to the stored procedures and functions it calls. Run{" "}
          <code className="text-slate-800 dark:text-slate-200">/create-flows</code> with a
          feature name to add a page.
        </p>

        {docs.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            No feature flows have been documented yet.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {docs.map((doc) => (
              <li key={doc.slug.join("/")}>
                <Link
                  className="block px-4 py-3 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  href={flowHref(doc.slug)}
                >
                  {doc.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
