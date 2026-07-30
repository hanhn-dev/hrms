import type React from "react";
import { Card } from "antd";

import type { SourceCapture } from "../../schemas/source-capture";

export function SourceReferencePanel({
  sourceCapture,
}: {
  sourceCapture: SourceCapture;
}): React.JSX.Element {
  return (
    <Card title="Source reference" className="border-slate-800 bg-slate-950/80 text-slate-100">
      <dl className="grid gap-3 text-sm text-slate-300">
        <div>
          <dt className="font-medium text-slate-100">Label</dt>
          <dd>{sourceCapture.sourceLabel}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-100">Type</dt>
          <dd>{sourceCapture.kind === "html_snapshot" ? "HTML Snapshot" : "Screenshot Image"}</dd>
        </div>
        {sourceCapture.originalUrl ? (
          <div>
            <dt className="font-medium text-slate-100">Original URL</dt>
            <dd className="break-all">{sourceCapture.originalUrl}</dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}