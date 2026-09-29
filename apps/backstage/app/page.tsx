import Link from "next/link";

export default function Page(): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold dark:text-white">Backstage</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Internal documentation and operator tools for HRMS.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            href="/docs"
          >
            Browse docs
          </Link>
          <Link
            className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
            href="/features"
          >
            Features
          </Link>
        </div>
      </div>
    </div>
  );
}
