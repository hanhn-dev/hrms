import type React from "react";
import { useState } from "react";
import { Button, Input } from "antd";

import { HtmlSnapshotImportSchema } from "../../schemas/source-capture";

const { TextArea } = Input;

export function HtmlImportForm({
  onSubmit,
}: {
  onSubmit: (payload: {
    readonly sourceLabel: string;
    readonly originalUrl?: string;
    readonly html: string;
  }) => Promise<void>;
}): React.JSX.Element {
  const [sourceLabel, setSourceLabel] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [html, setHtml] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsed = HtmlSnapshotImportSchema.safeParse({
      sourceType: "html_snapshot",
      sourceLabel,
      originalUrl: originalUrl || undefined,
      html,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Provide a valid HTML snapshot.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create draft from HTML.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm text-slate-200" htmlFor="html-source-label">
        Source label
        <Input id="html-source-label" value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm text-slate-200" htmlFor="html-original-url">
        Original URL
        <Input id="html-original-url" value={originalUrl} onChange={(event) => setOriginalUrl(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm text-slate-200" htmlFor="html-markup">
        HTML markup
        <TextArea id="html-markup" rows={10} value={html} onChange={(event) => setHtml(event.target.value)} />
      </label>
      {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
      <Button htmlType="submit" type="primary" loading={isSubmitting}>
        Create draft from HTML
      </Button>
    </form>
  );
}