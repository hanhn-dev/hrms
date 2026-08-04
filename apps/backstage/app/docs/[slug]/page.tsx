import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { notFound } from "next/navigation";
import { getAllWikiDocs, getWikiDoc, getWikiDocSlugs } from "../../../lib/docs";
import { ScrollableTable } from "../../../lib/markdown-components";

export function generateStaticParams(): { slug: string }[] {
  return getWikiDocSlugs().map((slug) => ({ slug }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;

  if (!getAllWikiDocs().some((doc) => doc.slug === slug)) {
    notFound();
  }

  const doc = getWikiDoc(slug);

  if (doc.format === "text") {
    return (
      <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
        {doc.content}
      </pre>
    );
  }

  return (
    <article className="prose prose-slate max-w-none">
      <Markdown components={{ table: ScrollableTable }} remarkPlugins={[remarkGfm]}>
        {doc.content}
      </Markdown>
    </article>
  );
}
