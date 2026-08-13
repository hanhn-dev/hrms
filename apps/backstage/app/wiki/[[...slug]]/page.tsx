import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { getAllWikiSlugs, getWikiPage, resolveWikiLink } from "../../../lib/llm-wiki";
import { MermaidAwarePre, ScrollableTable } from "../../../lib/markdown-components";

export function generateStaticParams(): { slug: string[] }[] {
  return getAllWikiSlugs().map((slug) => ({ slug }));
}

export default async function WikiPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<React.JSX.Element> {
  const { slug = [] } = await params;

  const exists = getAllWikiSlugs().some(
    (candidate) => candidate.join("/") === slug.join("/"),
  );
  if (!exists) {
    notFound();
  }

  const doc = getWikiPage(slug);
  const isEmpty = doc.content.trim().length === 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          {slug.length > 0 && (
            <Link className="no-underline" href="/wiki">
              ← Wiki index
            </Link>
          )}
          {isEmpty && (
            <p className="italic text-slate-500 dark:text-slate-400">This page has no content yet.</p>
          )}
          <Markdown
            components={{
              a: ({ href, children }) => {
                if (!href) return <>{children}</>;
                const resolved = resolveWikiLink(href, slug);
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
