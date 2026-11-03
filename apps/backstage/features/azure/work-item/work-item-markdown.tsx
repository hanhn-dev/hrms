"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function WorkItemMarkdown({ content }: { content: string }): React.JSX.Element {
  return (
    <div className="prose prose-slate max-w-none text-sm dark:prose-invert">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </div>
  );
}
