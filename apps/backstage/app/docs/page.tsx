import Link from "next/link";
import { getAllWikiDocs, type WikiDoc } from "../../lib/docs";

function groupByCategory(docs: WikiDoc[]): [WikiDoc["category"], WikiDoc[]][] {
  const order: WikiDoc["category"][] = ["Guides", "Database Baselines"];
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

  return (
    <div>
      <h1 className="text-2xl font-semibold">Docs</h1>
      {groups.map(([category, docs]) => (
        <section className="mt-8" key={category}>
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {category}
          </h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200">
            {docs.map((doc) => (
              <li key={doc.slug}>
                <Link
                  className="block px-4 py-3 hover:bg-slate-50"
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
  );
}
