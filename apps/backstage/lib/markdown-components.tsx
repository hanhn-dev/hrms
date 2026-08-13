import { isValidElement, type ReactNode } from "react";
import { Mermaid } from "./mermaid-diagram";
import { createSlugger } from "./slugify";

export function ScrollableTable({
  children,
}: {
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  );
}

function codeText(children: React.ReactNode): string {
  return Array.isArray(children) ? children.join("") : String(children ?? "");
}

export function MermaidAwarePre({
  children,
}: {
  children?: React.ReactNode;
}): React.JSX.Element {
  const child = Array.isArray(children) ? children[0] : children;
  if (
    isValidElement<{ className?: string; children?: React.ReactNode }>(child) &&
    child.props.className?.includes("language-mermaid")
  ) {
    return <Mermaid chart={codeText(child.props.children).trimEnd()} />;
  }
  return <pre>{children}</pre>;
}

function flattenToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenToText(node.props.children);
  }
  return "";
}

// Ids must line up with lib/features.ts's extractSections(), which slugifies
// the same heading text (in the same document order) independently — create a
// fresh instance per document render so ids don't leak across documents.
export function createHeadingComponents(): {
  h2: (props: { children?: ReactNode }) => React.JSX.Element;
  h3: (props: { children?: ReactNode }) => React.JSX.Element;
} {
  const slugify = createSlugger();

  return {
    h2: ({ children }) => <h2 id={slugify(flattenToText(children))}>{children}</h2>,
    h3: ({ children }) => <h3 id={slugify(flattenToText(children))}>{children}</h3>,
  };
}
