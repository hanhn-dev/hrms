import Link from "next/link";
import { databaseHref, databaseLabel, getCurrentDatabaseDocs, type DatabaseDoc } from "@/lib/database-docs";

function groupByDatabase(docs: DatabaseDoc[]): [string, DatabaseDoc[]][] {
  const groups = new Map<string, DatabaseDoc[]>();
  for (const doc of docs) {
    const group = groups.get(doc.database) ?? [];
    group.push(doc);
    groups.set(doc.database, group);
  }
  return [...groups.entries()].sort(([a], [b]) => databaseLabel(a).localeCompare(databaseLabel(b)));
}

function kindLabel(kind: DatabaseDoc["kind"]): string {
  return kind === "function" ? "Function" : "Procedure";
}

export default function DatabaseDocsPage(): React.JSX.Element {
  const groups = groupByDatabase(getCurrentDatabaseDocs());

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold dark:text-white">Database objects</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Step-by-step explanations of stored procedures and the functions they call. Run{" "}
          <code className="text-slate-800 dark:text-slate-200">/explain-stored-procedure</code> with
          a procedure name to add a page.
        </p>

        {groups.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            No procedures or functions have been documented yet.
          </p>
        ) : (
          groups.map(([database, docs]) => (
            <section className="mt-8" key={database}>
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {databaseLabel(database)}
              </h2>
              <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {docs.map((doc) => (
                  <li key={doc.slug.join("/")}>
                    <Link
                      className="block px-4 py-3 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                      href={databaseHref(doc.slug)}
                    >
                      <span className="block">{doc.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {kindLabel(doc.kind)}
                      </span>
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
