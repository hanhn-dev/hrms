import { isValidElement, type ReactNode } from "react";
import { HeadingPermalink } from "@/components/heading-permalink";
import { Mermaid } from "./mermaid-diagram";
import { createSlugger } from "./slugify";

function flattenToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return flattenToText(node.props.children);
  }
  return "";
}

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

// Swagger UI opblock-summary-method colors
const HTTP_METHOD_CHIP_BG: Record<string, string> = {
  GET: "bg-[#61affe]",
  POST: "bg-[#49cc90]",
  PUT: "bg-[#fca130]",
  PATCH: "bg-[#50e3c2]",
  DELETE: "bg-[#f93e3e]",
  HEAD: "bg-[#9012fe]",
  OPTIONS: "bg-[#0d5aa7]",
};

export function HttpMethodTableCell({
  children,
}: {
  children?: React.ReactNode;
}): React.JSX.Element {
  const method = flattenToText(children).trim().toUpperCase();
  const background = HTTP_METHOD_CHIP_BG[method];
  if (!background) {
    return <td>{children}</td>;
  }
  return (
    <td>
      <span
        className={
          "not-prose inline-flex min-w-[4.5rem] items-center justify-center rounded px-2 py-0.5 text-[11px] font-bold tracking-wide text-white " +
          background
        }
      >
        {method}
      </span>
    </td>
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

// Ids must line up with lib/features.ts's extractSections(), which slugifies
// the same heading text (in the same document order) independently — create a
// fresh instance per document render so ids don't leak across documents.
export function createHeadingComponents(): {
  h2: (props: { children?: ReactNode }) => React.JSX.Element;
  h3: (props: { children?: ReactNode }) => React.JSX.Element;
} {
  const slugify = createSlugger();

  function heading(
    Tag: "h2" | "h3",
    children: ReactNode,
  ): React.JSX.Element {
    const text = flattenToText(children);
    const id = slugify(text);
    return (
      <Tag className="group" id={id}>
        {children}
        <HeadingPermalink id={id} label={text} />
      </Tag>
    );
  }

  return {
    h2: ({ children }) => heading("h2", children),
    h3: ({ children }) => heading("h3", children),
  };
}
