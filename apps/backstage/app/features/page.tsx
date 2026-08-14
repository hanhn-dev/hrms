import Link from "next/link";
import { groupFeaturesByMenu } from "../../lib/feature-menu";
import { getAllFeatureDocs } from "../../lib/features";

export default function FeaturesPage(): React.JSX.Element {
  const groups = groupFeaturesByMenu(
    getAllFeatureDocs().map(({ slug, title, menu, submenu }) => ({
      slug,
      title,
      menu,
      submenu,
    })),
  );

  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Feature guides
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Generated module/feature guides connecting SourceCode call chains to the
          underlying HRMS-DATABASE tables and stored procedures. Grouped to match
          the HRMS left-nav. Produced by the{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            /document-feature
          </code>{" "}
          command.
        </p>

        {groups.length === 0 ? (
          <p className="mt-8 text-sm italic text-slate-500 dark:text-slate-400">
            No feature guides generated yet.
          </p>
        ) : (
          groups.map((group) => (
            <section className="mt-8" key={group.menu}>
              <h2 className="text-sm font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {group.menu}
              </h2>
              <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {group.subgroups.flatMap((subgroup) => subgroup.items).map((doc) => (
                  <li key={doc.slug}>
                    <Link
                      className="flex items-baseline justify-between gap-4 px-4 py-3 no-underline hover:bg-slate-50 dark:hover:bg-slate-900"
                      href={`/features/${doc.slug}`}
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {doc.title}
                      </span>
                      {doc.submenu ? (
                        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                          {doc.submenu}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
