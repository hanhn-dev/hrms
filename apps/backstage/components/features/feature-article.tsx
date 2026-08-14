import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { FeatureDoc } from "../../lib/features";
import {
  MermaidAwarePre,
  ScrollableTable,
  createHeadingComponents,
} from "../../lib/markdown-components";
import { DocumentHeader } from "./document-header";
import { ScrollableArticle } from "./scrollable-article";
import { TableOfContents } from "./table-of-contents";

export function FeatureArticle({ doc }: { doc: FeatureDoc }): React.JSX.Element {
  const headingComponents = createHeadingComponents();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ScrollableArticle
          header={<DocumentHeader doc={doc} />}
          stickyHeader={<DocumentHeader doc={doc} compact />}
        >
          <Markdown
            components={{
              table: ScrollableTable,
              pre: MermaidAwarePre,
              h1: () => null,
              ...headingComponents,
            }}
            remarkPlugins={[remarkGfm]}
          >
            {doc.content}
          </Markdown>
        </ScrollableArticle>
      </div>
      <TableOfContents sections={doc.sections} />
    </div>
  );
}
