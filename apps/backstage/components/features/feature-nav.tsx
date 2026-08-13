"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FeatureNav({
  docs,
}: {
  docs: { slug: string; title: string }[];
}): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50">
      <div className="px-4 py-4">
        <Link className="text-sm font-semibold text-slate-900 no-underline" href="/features">
          Features
        </Link>
      </div>
      {docs.length === 0 ? (
        <p className="px-4 py-2 text-sm italic text-slate-500">
          No feature guides generated yet.
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-slate-200">
          {docs.map((doc) => {
            const href = `/features/${doc.slug}`;
            const active = pathname === href;
            return (
              <li key={doc.slug}>
                <Link
                  className={
                    active
                      ? "block bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                      : "block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
                  }
                  href={href}
                >
                  {doc.title}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
