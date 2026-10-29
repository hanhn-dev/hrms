"use client";

import { Tag } from "antd";
import { KIND_COLOR } from "@/features/dbs/kind-style";
import { HighlightMatch } from "@/shared/ui";

function chipColor(kind: string): string {
  if (kind in KIND_COLOR) {
    return KIND_COLOR[kind as keyof typeof KIND_COLOR];
  }
  return "default";
}

export function DatabaseObjectChip({
  text,
  kind,
  query,
  onOpen,
}: {
  text: string;
  kind: string;
  query?: string;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <Tag
      className="mx-0.5 inline-flex cursor-pointer align-baseline font-mono text-[11px] leading-5"
      color={chipColor(kind)}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <HighlightMatch query={query} text={text} />
    </Tag>
  );
}
