"use client";

import { Button, Descriptions, Modal, Spin, Typography } from "antd";
import { useState } from "react";
import { loadSectionLookupRow } from "@/features/employee/sections/lookup-actions";
import type { SectionLookupRef } from "@/features/employee/sections/queries";
import { formatDate } from "@/shared/format-date";

function displayLookupValue(value: string | null): string {
  if (value == null || value === "") return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value);
  return value;
}

export function useSectionLookupModal(): {
  openLookup: (lookup: SectionLookupRef) => void;
  modal: React.JSX.Element;
} {
  const [lookup, setLookup] = useState<SectionLookupRef | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<{ label: string; value: string | null }[]>([]);
  const [found, setFound] = useState(true);
  const [title, setTitle] = useState("Master record");

  function openLookup(next: SectionLookupRef): void {
    setLookup(next);
    setLoading(true);
    setError(null);
    setItems([]);
    setFound(true);
    setTitle(`Id ${next.id}`);
    void loadSectionLookupRow(next.lookupKey, next.id)
      .then((detail) => {
        setTitle(`${detail.title} ${detail.id}`);
        setFound(detail.found);
        setItems(detail.items);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not load this record.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const modal = (
    <Modal
      title={title}
      open={lookup != null}
      onCancel={() => setLookup(null)}
      footer={[
        <Button key="close" onClick={() => setLookup(null)}>
          Close
        </Button>,
      ]}
      width={640}
      destroyOnHidden
    >
      {loading ? <Spin /> : null}
      {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
      {!loading && !error && !found ? (
        <Typography.Text>The master record was not found.</Typography.Text>
      ) : null}
      {!loading && !error && found ? (
        <Descriptions
          column={1}
          size="small"
          items={items.map((item) => ({
            key: item.label,
            label: item.label,
            children: displayLookupValue(item.value),
          }))}
        />
      ) : null}
    </Modal>
  );

  return { openLookup, modal };
}

export function SectionLookupIdButton({
  id,
  onClick,
}: {
  id: number;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <Button type="link" size="small" style={{ padding: 0 }} onClick={onClick}>
      {id}
    </Button>
  );
}
