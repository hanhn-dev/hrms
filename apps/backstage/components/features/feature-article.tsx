import Link from "next/link";
import type { FeatureDoc, FeatureVersion } from "@/lib/features";
import { HeadingCopyListener } from "@/components/heading-copy-listener";
import { DocumentHeader } from "./document-header";
import { FeatureMarkdown } from "./feature-markdown";
import { ScrollableArticle } from "./scrollable-article";
import { TableOfContents } from "./table-of-contents";

export function FeatureArticle({
  doc,
  versions,
}: {
  doc: FeatureDoc;
  versions: FeatureVersion[];
}): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ScrollableArticle
          header={<DocumentHeader doc={doc} versions={versions} />}
          stickyHeader={<DocumentHeader compact doc={doc} versions={versions} />}
        >
          <HeadingCopyListener />
          {doc.isArchive ? (
            <p className="not-prose mt-0 mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Historical snapshot
              {doc.lastAnalyzed ? ` from ${doc.lastAnalyzed}` : ""}.{" "}
              <Link
                className="font-medium underline"
                href={`/features/${doc.currentSlug}`}
              >
                View latest
              </Link>
            </p>
          ) : null}
          <FeatureMarkdown content={doc.content} />
        </ScrollableArticle>
      </div>
      <TableOfContents sections={doc.sections} />
    </div>
  );
}
