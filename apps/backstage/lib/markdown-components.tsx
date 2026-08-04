import { isValidElement } from "react";
import { Mermaid } from "./mermaid-diagram";

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
