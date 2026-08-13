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
        <Link className="text-sm no-underline" href="/features">
          ← Features index
        </Link>
        <Markdown
          components={{
            table: ScrollableTable,
            pre: MermaidAwarePre,
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
