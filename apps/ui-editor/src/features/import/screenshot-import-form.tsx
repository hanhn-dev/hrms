import type React from "react";
import { useState } from "react";
import { Button, Input } from "antd";

export function ScreenshotImportForm({
  onSubmit,
}: {
  onSubmit: (payload: {
    readonly sourceLabel: string;
    readonly fileName: string;
    readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
    readonly width: number;
    readonly height: number;
    readonly contentRef: string;
  }) => Promise<void>;
}): React.JSX.Element {
  const [sourceLabel, setSourceLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!file) {
      setErrorMessage("Select a screenshot file to continue.");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrorMessage("Upload a PNG, JPEG, or WebP screenshot.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        sourceLabel,
        fileName: file.name,
        mimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
        width: 1440,
        height: 900,
        contentRef: URL.createObjectURL(file),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create draft from screenshot.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm text-slate-200" htmlFor="screenshot-source-label">
        Source label
        <Input id="screenshot-source-label" value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm text-slate-200" htmlFor="screenshot-file">
        Screenshot file
        <input
          id="screenshot-file"
          accept="image/png,image/jpeg,image/webp"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
      <Button htmlType="submit" type="primary" loading={isSubmitting}>
        Create draft from screenshot
      </Button>
    </form>
  );
}