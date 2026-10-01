"use client";

import { Tag } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { entityHref, type EntityRef } from "@/shared/entity-link/entity-href";

export function EntityLink({
  employerId,
  entity,
  appearance = "text",
  color,
  children,
}: {
  employerId: number;
  entity: EntityRef | null;
  appearance?: "text" | "tag";
  color?: string;
  children: ReactNode;
}): React.JSX.Element {
  const href = entity ? entityHref(employerId, entity) : null;
  const label =
    appearance === "tag" ? (
      <Tag className="m-0" color={color}>
        {children}
      </Tag>
    ) : (
      children
    );

  if (!href) {
    return <>{label}</>;
  }

  return (
    <Link href={href} onClick={(event) => event.stopPropagation()}>
      {label}
    </Link>
  );
}
