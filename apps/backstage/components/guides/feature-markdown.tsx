import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseSourceCitation } from "@/features/flows/source-citation";
import {
  HttpMethodTableCell,
  MermaidAwarePre,
  ScrollableTable,
  createHeadingComponents,
} from "@/lib/markdown-components";
import { SourceCodeLink } from "./source-code-link";

function inlineCodeText(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(inlineCodeText).join("");
  return "";
}

export function FeatureMarkdown({ content }: { content: string }): React.JSX.Element {
  const headingComponents = createHeadingComponents();

  return (
    <Markdown
      components={{
        table: ScrollableTable,
        td: HttpMethodTableCell,
        pre: MermaidAwarePre,
        code: ({ className, children }) => {
          const label = inlineCodeText(children);
          const citation = className ? null : parseSourceCitation(label);
          if (!citation) return <code className={className}>{children}</code>;
          return <SourceCodeLink citation={citation} label={label} />;
        },
        h1: () => null,
        ...headingComponents,
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </Markdown>
  );
}
