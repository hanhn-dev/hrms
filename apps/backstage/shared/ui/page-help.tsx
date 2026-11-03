"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Modal } from "antd";
import { useState } from "react";

export type PageHelpNote = {
  id: string;
  type: "info" | "warning" | "success";
  title: string;
  description?: string;
};

export function PageHelpTrigger({
  notes,
  title = "About this page",
  icon = <InfoCircleOutlined />,
  ariaLabel,
  className,
}: {
  notes: PageHelpNote[];
  title?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        aria-label={ariaLabel ?? `About ${title}`}
        className={className ?? "!h-auto !w-auto !p-0"}
        icon={icon}
        type="text"
        onClick={() => {
          setOpen(true);
        }}
      />
      <Modal
        footer={null}
        open={open}
        title={title}
        onCancel={() => {
          setOpen(false);
        }}
      >
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <Alert
              key={note.id}
              showIcon
              type={note.type}
              title={note.title}
              description={note.description}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}
