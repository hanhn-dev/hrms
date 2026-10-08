import Link from "next/link";
import { databaseHref, getCurrentDatabaseDocs } from "@/lib/database-docs";
import { getAllWikiDocs, type WikiDoc } from "@/lib/docs";
import { getCurrentFeatureDocs } from "@/lib/guides";

function groupByCategory(docs: WikiDoc[]): [WikiDoc["category"], WikiDoc[]][] {
  const order: WikiDoc["category"][] = ["Database updates", "Guides", "Database Baselines"];
  return order
    .map((category): [WikiDoc["category"], WikiDoc[]] => [
      category,
      docs
        .filter((doc) => doc.category === category)
        .sort((a, b) => a.title.localeCompare(b.title)),
    ])
    .filter(([, group]) => group.length > 0);
}

export default function DocsPage(): React.JSX.Element {
  const groups = groupByCategory(getAllWikiDocs());
  const productGuides = getCurrentFeatureDocs()
    .map(({ slug, title, menu }) => ({ slug, title, menu }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const databaseDocs = getCurrentDatabaseDocs().slice(0, 8);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold dark:text-white">Docs</h1>

        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Product guides
            </h2>
            <Link
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              href="/docs/guides"
            >
              Browse all →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {productGuides.slice(0, 8).map((doc) => (
              <li key={doc.slug}>
                <Link
                  className="block px-4 py-3 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  href={`/docs/guides/${doc.slug}`}
                >
                  <span className="block">{doc.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {doc.menu}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Database objects
            </h2>
            <Link
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              href="/docs/database"
            >
              Browse all →
            </Link>
          </div>
          {databaseDocs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No procedures or functions have been documented yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {databaseDocs.map((doc) => (
                <li key={doc.slug.join("/")}>
                  <Link
                    className="block px-4 py-3 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                    href={databaseHref(doc.slug)}
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {groups.map(([category, docs]) => (
          <section className="mt-8" key={category}>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {category}
            </h2>
            <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {docs.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    className="block px-4 py-3 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                    href={`/docs/${doc.slug}`}
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
