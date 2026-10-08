import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { VersionSelect } from "@/components/guides/version-select";
import {
  databaseHref,
  getAllDatabaseDocs,
  getDatabaseDoc,
  getDatabaseVersions,
  resolveDatabaseDocLink,
} from "@/lib/database-docs";
import { MermaidAwarePre, ScrollableTable } from "@/lib/markdown-components";

export const dynamicParams = true;

export function generateStaticParams(): { slug: string[] }[] {
  return getAllDatabaseDocs().map((doc) => ({ slug: doc.slug }));
}

export default async function DatabaseDocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const doc = getDatabaseDoc(slug);
  if (!doc) {
    notFound();
  }

  const versions = getDatabaseVersions(doc.currentSlug);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <Link className="no-underline" href="/docs/database">
            ← Database objects
          </Link>
          {doc.isArchive ? (
            <p className="not-prose mt-4 mb-0 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Historical snapshot{doc.lastAnalyzed ? ` from ${doc.lastAnalyzed}` : ""}.{" "}
              <Link className="font-medium underline" href={databaseHref(doc.currentSlug)}>
                View latest
              </Link>
            </p>
          ) : null}
          {doc.lastAnalyzed ? (
            <time
              className="not-prose mt-4 block text-sm text-slate-500 dark:text-slate-400"
              dateTime={doc.lastAnalyzed}
            >
              Last analyzed: {doc.lastAnalyzed}
            </time>
          ) : null}
          <VersionSelect currentSlug={doc.slug.join("/")} versions={versions} />
          <Markdown
            components={{
              a: ({ href, children }) => {
                if (!href) return <>{children}</>;
                const resolved = resolveDatabaseDocLink(href, slug);
                if (resolved.startsWith("/")) {
                  return <Link href={resolved}>{children}</Link>;
                }
                return (
                  <a href={resolved} rel="noopener noreferrer" target="_blank">
                    {children}
                  </a>
                );
              },
              table: ScrollableTable,
              pre: MermaidAwarePre,
            }}
            remarkPlugins={[remarkGfm]}
          >
            {doc.content}
          </Markdown>
        </article>
      </div>
    </div>
  );
}
