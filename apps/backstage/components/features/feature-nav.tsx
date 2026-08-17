"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  groupFeaturesByMenu,
  type FeatureMenuGroup,
  type FeatureNavItem,
} from "@/lib/feature-menu";

function itemsInGroup(group: FeatureMenuGroup): FeatureNavItem[] {
  return group.subgroups.flatMap((subgroup) => subgroup.items);
}

export function FeatureNav({
  docs,
}: {
  docs: FeatureNavItem[];
}): React.JSX.Element {
  const pathname = usePathname();
  const groups = groupFeaturesByMenu(docs);

  return (
    <nav
      data-feature-nav=""
      className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <Link
          className="text-sm font-semibold text-slate-900 no-underline dark:text-white"
          href="/features"
        >
          Features
        </Link>
      </div>
      {docs.length === 0 ? (
        <p className="px-4 py-2 text-sm italic text-slate-500 dark:text-slate-400">
          No feature guides generated yet.
        </p>
      ) : (
        <div className="flex-1 space-y-5 px-3 py-4">
          {groups.map((group) => (
            <section key={group.menu}>
              <h2 className="px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {group.menu}
              </h2>
              <ul className="mt-1.5 ml-2 border-l border-slate-200 dark:border-slate-700">
                {itemsInGroup(group).map((doc) => {
                  const href = `/features/${doc.slug}`;
                  const editHref = `/features/edit/${doc.slug}`;
                  const active =
                    pathname === href ||
                    pathname.startsWith(`${href}/`) ||
                    pathname === editHref;
                  return (
                    <li key={doc.slug}>
                      <Link
                        className={
                          active
                            ? "-ml-px block border-l-2 border-slate-900 bg-slate-900 py-2 pr-3 pl-3 text-sm font-medium text-white dark:border-indigo-500 dark:bg-indigo-600"
                            : "-ml-px block border-l-2 border-transparent py-2 pr-3 pl-3 text-sm font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-100 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        }
                        href={href}
                      >
                        {doc.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </nav>
  );
}
