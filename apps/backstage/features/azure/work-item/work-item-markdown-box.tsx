"use client";

import { useState } from "react";
import { FullscreenExitOutlined, FullscreenOutlined } from "@ant-design/icons";
import { Button, Modal } from "antd";
import {
  WORK_ITEM_MARKDOWN_BOX_HEIGHT_PX,
  WORK_ITEM_MARKDOWN_BOX_MIN_HEIGHT_PX,
} from "@/features/azure/work-item/work-item-markdown-box-size";
import { WorkItemMarkdown } from "@/features/azure/work-item/work-item-markdown";

export function WorkItemMarkdownBox({
  title,
  content,
}: {
  title: string;
  content: string;
}): React.JSX.Element {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <section className="rounded-md border border-slate-200 dark:border-slate-700">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-200 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-700">
          <h3 className="m-0 text-sm font-semibold">{title}</h3>
          <Button
            aria-label={`Expand ${title} to full screen`}
            icon={<FullscreenOutlined />}
            size="small"
            type="text"
            onClick={() => {
              setFullscreen(true);
            }}
          />
        </header>
        <div
          className="overflow-auto px-3 py-2"
          style={{
            height: WORK_ITEM_MARKDOWN_BOX_HEIGHT_PX,
            minHeight: WORK_ITEM_MARKDOWN_BOX_MIN_HEIGHT_PX,
            maxHeight: "70vh",
            resize: "vertical",
          }}
        >
          <WorkItemMarkdown content={content} />
        </div>
      </section>
      <Modal
        destroyOnHidden
        footer={null}
        open={fullscreen}
        style={{ top: 0, maxWidth: "100vw", margin: 0, paddingBottom: 0 }}
        styles={{
          header: { paddingInlineEnd: 72 },
          body: { maxHeight: "calc(100vh - 72px)", overflowY: "auto" },
        }}
        title={
          <>
            {title}
            <Button
              aria-label={`Exit ${title} full screen`}
              icon={<FullscreenExitOutlined />}
              style={{
                position: "absolute",
                top: 12,
                insetInlineEnd: 48,
                zIndex: 20,
                width: 32,
                height: 32,
              }}
              type="text"
              onClick={() => {
                setFullscreen(false);
              }}
            />
          </>
        }
        width="100vw"
        onCancel={() => {
          setFullscreen(false);
        }}
      >
        <WorkItemMarkdown content={content} />
      </Modal>
    </>
  );
}
