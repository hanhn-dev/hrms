import Link from "next/link";
import { notFound } from "next/navigation";
import { FeatureMarkdown } from "@/components/guides/feature-markdown";
import { VersionSelect } from "@/components/guides/version-select";
import { flowHref, getAllFlowDocs, getFlowDoc, getFlowVersions } from "@/lib/flow-docs";

export const dynamicParams = true;

export function generateStaticParams(): { slug: string[] }[] {
  return getAllFlowDocs().map((doc) => ({ slug: doc.slug }));
}

export default async function FlowDocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const doc = getFlowDoc(slug);
  if (!doc) {
    notFound();
  }

  const versions = getFlowVersions(doc.currentSlug);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <Link className="no-underline" href="/docs/flows">
            ← Request flows
          </Link>
          {doc.isArchive ? (
            <p className="not-prose mt-4 mb-0 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Historical snapshot{doc.lastAnalyzed ? ` from ${doc.lastAnalyzed}` : ""}.{" "}
              <Link className="font-medium underline" href={flowHref(doc.currentSlug)}>
                View latest
              </Link>
            </p>
          ) : null}
          <h1>{doc.title}</h1>
          {doc.lastAnalyzed ? (
            <time
              className="not-prose mt-0 mb-4 block text-sm text-slate-500 dark:text-slate-400"
              dateTime={doc.lastAnalyzed}
            >
              Last analyzed: {doc.lastAnalyzed}
            </time>
          ) : null}
          <VersionSelect currentSlug={doc.slug.join("/")} versions={versions} />
          <FeatureMarkdown content={doc.content} />
        </article>
      </div>
    </div>
  );
}
