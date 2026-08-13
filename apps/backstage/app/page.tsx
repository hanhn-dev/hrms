import Link from "next/link";

export default function Page(): React.JSX.Element {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold dark:text-white">Backstage</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Internal documentation and utilities for HRMS.
        </p>
        <Link
          className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          href="/docs"
        >
          Browse docs
        </Link>
      </div>
    </div>
  );
}
