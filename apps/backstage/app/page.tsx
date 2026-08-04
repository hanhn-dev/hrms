import Link from "next/link";

export default function Page(): React.JSX.Element {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Backstage</h1>
      <p className="mt-2 text-slate-600">
        Internal documentation and utilities for HRMS.
      </p>
      <Link
        className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
        href="/docs"
      >
        Browse docs
      </Link>
    </div>
  );
}
