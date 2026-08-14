import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { FeatureDoc } from "../../lib/features";
import {
  MermaidAwarePre,
  ScrollableTable,
  createHeadingComponents,
} from "../../lib/markdown-components";
import { TableOfContents } from "./table-of-contents";

export function FeatureArticle({ doc }: { doc: FeatureDoc }): React.JSX.Element {
  const headingComponents = createHeadingComponents();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <article className="prose prose-slate dark:prose-invert max-w-none min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <p className="not-prose mt-0 mb-6">
          <Link
            className="text-sm text-slate-600 no-underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            href="/features"
          >
            ← Features index
          </Link>
        </p>
        <Markdown
          components={{
            table: ScrollableTable,
            pre: MermaidAwarePre,
            h1: ({ children }) => (
              <h1 className="mt-0">
                <span className="block">{children}</span>
                {doc.lastAnalyzed ? (
                  <time
                    className="mt-1 block text-sm font-normal text-slate-500 dark:text-slate-400"
                    dateTime={doc.lastAnalyzed}
                  >
                    Last analyzed: {doc.lastAnalyzed}
                  </time>
                ) : null}
              </h1>
            ),
            ...headingComponents,
          }}
          remarkPlugins={[remarkGfm]}
        >
          {doc.content}
        </Markdown>
      </article>
      <TableOfContents sections={doc.sections} />
    </div>
  );
}
