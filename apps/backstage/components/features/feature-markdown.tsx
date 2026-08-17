import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MermaidAwarePre,
  ScrollableTable,
  createHeadingComponents,
} from "@/lib/markdown-components";

export function FeatureMarkdown({ content }: { content: string }): React.JSX.Element {
  const headingComponents = createHeadingComponents();

  return (
    <Markdown
      components={{
        table: ScrollableTable,
        pre: MermaidAwarePre,
        h1: () => null,
        ...headingComponents,
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </Markdown>
  );
}
